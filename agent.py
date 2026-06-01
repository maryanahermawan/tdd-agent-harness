"""
Agent Session Logic
===================

Core agent interaction functions for running autonomous coding sessions.
"""

import asyncio
from pathlib import Path
from typing import Optional

from claude_agent_sdk import ClaudeSDKClient

from client import create_client
from progress import print_turn_header, print_progress_summary
from prompts import copy_spec_to_project, load_prompt


# Configuration
AUTO_CONTINUE_DELAY_SECONDS = 3


# At code implementation agent, relevant tests are run for features just developed.
# Autonomous agent run the entire specifications for regression and as stop condition.
async def run_test_runner_agent(
    client: ClaudeSDKClient,
    project_dir: Path,
) -> bool:
    """
    Use a test-runner subagent to run functional tests.
    """
    test_instruction = """
    You must use a test-runner subagent to run functional tests.
    Run all backend and frontend functional tests in functional_tests folder.
    Update summary file functional_tests_summary.json with test result (PASS/FAIL).
    Sequential Execution Preferred: Databases can experience race conditions if multiple tests write to the same table at once.
    """

    # 1. Run the agent session
    status, result = await run_agent_session(client, test_instruction, project_dir)

    # If the agent session itself crashed or error out, tests did not pass
    if status == "error":
        print("⚠️ Test runner agent session encountered an operational error.")
        return False

    # 2. Check the actual summary file updated by the agent
    summary_file_path = (
        project_dir / "functional_tests" / "functional_tests_summary.json"
    )

    try:
        if summary_file_path.exists():
            content = summary_file_path.read_text().upper()

            if "PASS" in content and "FAIL" not in content:
                return True
            else:
                print("❌ Summary file indicates test failures or incomplete runs.")
                return False
        else:
            print("⚠️ Summary file was not created or found by the agent.")
            return False

    except Exception as e:
        print(f"⚠️ Failed to read summary file: {e}")
        return False


async def run_agent_session(
    client: ClaudeSDKClient,
    message: str,
    project_dir: Path,
) -> tuple[str, str]:
    """
    Run a single agent session using Claude Agent SDK.

    Args:
        client: Claude SDK client
        message: The prompt to send
        project_dir: Project directory path

    Returns:
        (status, response_text) where status is:
        - "success" if agent should continue working
        - "error" if an error occurred
    """
    print("Sending prompt to Claude Agent SDK...\n")

    try:
        # Send the query
        await client.query(message)

        response_text = ""
        async for msg in client.receive_response():
            # The async for loop keeps running as Claude thinks, calls tools, observes results,
            # and decides what to do next.
            # Each iteration yields a message: Claude’s reasoning, a tool call, a tool result, or the final outcome.
            # The SDK handles the orchestration (tool execution, context management, retries) so you just consume the stream.
            # The loop ends when Claude finishes the task or hits an error.
            msg_type = type(msg).__name__

            # Main message types:
            # AssistantMessage – Claude's response with content blocks (text, tool calls, thinking)
            # ResultMessage – Final result with cost, usage, duration, and stop reason
            # UserMessage – User input message (rarely yielded, mainly for reference)
            # SystemMessage – System metadata (e.g., session initialization, compact boundary)

            # Handle AssistantMessage (text and tool use)
            if msg_type == "AssistantMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__

                    if block_type == "TextBlock" and hasattr(block, "text"):
                        response_text += block.text
                        print(block.text, end="", flush=True)
                    elif block_type == "ToolUseBlock" and hasattr(block, "name"):
                        print(f"\n[Tool: {block.name}]", flush=True)
                        if hasattr(block, "input"):
                            input_str = str(block.input)
                            if len(input_str) > 200:
                                print(f"   Input: {input_str[:200]}...", flush=True)
                            else:
                                print(f"   Input: {input_str}", flush=True)

            # Handle UserMessage (tool results)
            elif msg_type == "UserMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__

                    if block_type == "ToolResultBlock":
                        result_content = getattr(block, "content", "")
                        is_error = getattr(block, "is_error", False)

                        # Check if command was blocked by security hook
                        if "blocked" in str(result_content).lower():
                            print(f"   [BLOCKED] {result_content}", flush=True)
                        elif is_error:
                            # Show errors (truncated)
                            error_str = str(result_content)[:500]
                            print(f"   [Error] {error_str}", flush=True)
                        else:
                            # Tool succeeded - just show brief confirmation
                            print("   [Done]", flush=True)

        print("\n" + "-" * 70 + "\n")
        return "success", response_text

    except Exception as e:
        print(f"Error during agent session: {e}")
        return "error", str(e)


async def run_autonomous_agent(
    project_dir: Path,
    model: str,
    max_iterations: Optional[int] = None,
) -> None:
    """
    Run the autonomous agent loop.

    Args:
        project_dir: Directory for the project
        model: Claude model to use
        max_iterations: Maximum number of iterations (None for unlimited)
    """
    print("\n" + "=" * 70)
    print("  AUTONOMOUS CODING AGENT DEMO")
    print("=" * 70)
    print(f"\nProject directory: {project_dir}")
    print(f"Model: {model}")
    if max_iterations:
        print(f"Max iterations: {max_iterations}")
    else:
        print("Max iterations: Unlimited (will run until completion)")
    print()

    # Create project directory
    project_dir.mkdir(parents=True, exist_ok=True)

    # Check if this is a fresh start or continuation
    summary_file = project_dir / "functional_tests" / "functional_tests_summary.json"
    is_first_run = not summary_file.exists()

    if is_first_run:
        print("Fresh start - will use initializer agent")
        print()
        print("=" * 70)
        print("  NOTE: First session takes 10-20+ minutes!")
        print("  The agent is generating detailed test cases.")
        print("  This may appear to hang - it's working. Watch for [Tool: ...] output.")
        print("=" * 70)
        print()
        # Copy the app spec into the project directory for the agent to read
        copy_spec_to_project(project_dir)
    else:
        print("Continuing existing project")
        print_progress_summary(project_dir)

    # This session has autonomous agent running in a loop; the context stays in multiple iterations.
    # Subagents for delegated tasks with separate contexts from the main agent.
    iteration = 0

    # Create client (fresh context)
    client = create_client(project_dir, model)

    async with client:
        while True:
            iteration += 1
            # Check max iterations
            if max_iterations and iteration > max_iterations:
                print(f"\nReached max iterations ({max_iterations})")
                print("To continue, run the script again without --max-iterations")
                break

            # Print turn header
            print_turn_header(iteration, is_first_run)

            # Choose prompt based on session type
            if is_first_run:
                prompt = "Activate initializer subagent to complete its task"
                is_first_run = False  # Only use initializer once
            else:
                all_test_passed = await run_test_runner_agent(client, project_dir)
                if all_test_passed:
                    print("🎉 All tests passed successfully!")
                    break
                elif iteration > 1:
                    prompt = load_prompt("iterative_coding_prompt")
                else:
                    prompt = load_prompt("coding_prompt")

            # Run session with active connection
            status, response = await run_agent_session(client, prompt, project_dir)

            # Handle status
            if status == "success":
                print(
                    f"\nAgent will auto-continue in {AUTO_CONTINUE_DELAY_SECONDS}s..."
                )
                print_progress_summary(project_dir)
                await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)

            elif status == "error":
                print("\nSession encountered an error")
                print("Will retry with a fresh session...")
                await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)

            # Small delay between sessions
            if max_iterations is None or iteration < max_iterations:
                print("\nPreparing next session...\n")
                await asyncio.sleep(1)

            preview = (
                f"{response[:150]}...\n[Truncated]...\n...{response[-150:]}"
                if len(response) > 400
                else response
            )
            print(f"\n📝 Iteration {iteration} Response Preview:\n{preview}\n")

    # Final summary
    print("\n" + "=" * 70)
    print("  SESSION COMPLETE")
    print("=" * 70)
    print(f"\nProject directory: {project_dir}")
    print_progress_summary(project_dir)

    # Print instructions for running the generated application
    print("\n" + "-" * 70)
    print("  TO RUN THE GENERATED APPLICATION:")
    print("-" * 70)
    print(f"\n  cd {project_dir.resolve()}")
    print("  ./init.sh           # Run the setup script")
    print("  # Or manually:")
    print("  npm install && npm run dev")
    print("\n  Then open http://localhost:3000 (or check init.sh for the URL)")
    print("-" * 70)

    print("\nDone!")
