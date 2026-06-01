# TDD Agent Harness

An agentic coding loop built on the Claude Agent SDK where tests drive everything.
The loop runs until the full test suite passes — not until the agent thinks it's done.

Specify an application in `prompts/app_spec.txt`, run the harness, and get a working,
tested codebase as output. The demo app (`proximity_service`) is a geospatial + semantic
search service using PostGIS and pgvector.

Inspired by [anthropics/claude-quickstarts/autonomous-coding](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding),
with deliberate architectural changes documented below.


## How This Differs from claude-quickstarts/autonomous-coding

This project is inspired by anthropics/claude-quickstarts but makes deliberate architectural changes:

- **Test-runner as loop exit condition** — the loop stops only when the full test suite passes,
  not when the agent decides it's done. Objective pass/fail replaces agent self-assessment.
- **Retained context across iterations** — one client and context is maintained across the
  coding loop, while the initializer and test-runner run as sub-agents with separate contexts.
- **Initializer writes runnable tests, not a plan** — the initializer generates actual test
  methods (backend + E2E frontend) in `functional_tests_summary.json`, not just a feature list.
- **General-purpose by design** — specify any application via `prompts/app_spec.txt` and
  `prompts/initializer_prompt.md`. The demo app (`proximity_service`) uses PostGIS and pgvector
  to show the harness handles real infrastructure.


## Prerequisites

**Required:** Install the latest versions of both Claude Code and the Claude Agent SDK:

```bash
# Install Claude Code CLI (latest version required) for building agent
npm install -g @anthropic-ai/claude-code

# Install Python dependencies
pip install -r requirements.txt
```

Verify your installations:
```bash
claude --version  # Should be latest version
pip show claude-agent-sdk  # Check SDK is installed
```

**API Key:** Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

## Quick Start

```bash
python autonomous_agent_demo.py --project-dir ./proximity_service 2>&1 | tee agent_proximity_service.log
```

For testing with limited iterations (recommended) and save the logs:
(You need to have some credit in Anthropic console.)

```bash
COUNTER=1; while [ -f "agent_proximity_service_$COUNTER.log" ]; do ((COUNTER++)); done; python autonomous_agent_demo.py --project-dir ./proximity_service --max-iterations 5 2>&1 | tee "agent_proximity_service_$COUNTER.log"
```

## Important Timing Expectations

> **Warning: This demo takes a long time to run!**

- **First session (initialization):** The agent generates a `functional_tests_summary.json` with test cases. This takes several minutes and may appear to hang - this is normal. The agent is writing out all the features.

- **Subsequent sessions:** Each coding iteration can take **5-15 minutes** depending on complexity.

- **Full app:** Building all features typically requires **many hours** of total runtime across multiple sessions.

**Tip:** The features parameter in the prompts is designed for comprehensive coverage. If you want faster demos, you can modify `prompts/initializer_prompt.md` to reduce the feature count (e.g., 20-50 features for a quicker demo).

## How It Works

### Three-Agent Pattern

1. **Initializer Sub-agent:** Reads `app_spec.txt`, seeds the database, and writes
   functional tests and a summary to `functional_tests_summary.json` with 20/n test
   cases. Sets up the project structure and updates `claude-progress.txt`. Also acts
   as a planner: categorizes test cases by priority (P1/P2/P3) and type
   (backend/end-to-end), and groups them logically into test files.

2. **Coding Agent:** Reads project context and schema from `app_spec.txt` and
   `claude-progress.txt`, then implements features group by group, marking them as
   passing in `functional_tests_summary.json`. Mirrors how a software engineer
   approaches a real application: starting from higher priority (P1), backend before
   end-to-end (frontend), with tests sharing the same `test_file_name` or related
   descriptions as the natural grouping unit. Focuses on one group at a time,
   running only the relevant tests.

3. **Test Runner Sub-agent:** Runs the full regression suite. If all tests pass,
   the agentic loop exits.

### Session Management

- Each iteration retains context window
- Agentic loop will exit if test-runner subagent runs all test suites and all pass or max iterations reached
- Progress is persisted via `functional_tests_summary.json` and git commits
- The agent auto-continues between iterations (3 second delay)


## Security Model

This demo uses a defense-in-depth security approach (see `security.py` and `client.py`):

1. **OS-level Sandbox:** Bash commands run in an isolated environment
2. **Filesystem Restrictions:** File operations restricted to the project directory only
3. **Bash Allowlist:** Only specific commands are permitted:
   - File inspection: `ls`, `cat`, `head`, `tail`, `wc`, `grep`, etc
   - Node.js: `npm`, `node`
   - Version control: `git`
   - Process management: `ps`, `lsof`, `sleep`, `pkill` (dev processes only)
   - Test commands

Commands not in the allowlist are blocked by the security hook.

## Project Structure

```
tdd-agent-harness/
├── autonomous_agent_demo.py  # Main entry point
├── agent.py                  # Agent session logic
├── client.py                 # Claude SDK client configuration
├── security.py               # Bash command allowlist and validation
├── progress.py               # Progress tracking utilities
├── prompts.py                # Prompt loading utilities
├── prompts/
│   ├── app_spec.txt          # Application specification
│   ├── initializer_prompt.md # Initialize TDD development project prompt
│   └── database_seeding.md   # (Optional) get initializer subagent to seed application data
│   └── coding_prompt.md      # Coding session prompt
│   └── iterative_coding_prompt.md      # Continuation coding session prompt
└── requirements.txt          # Python dependencies
```

## Generated Project Structure

After running, your project directory will contain:

```
proximity_service/
├── functional_tests
|     ├──functional_tests_summary.json         # Test cases (source of truth)
|     └── <test files>
├── app_spec.txt              # Copied specification
├── init.sh                   # Environment setup script
├── claude-progress.txt       # Session progress notes
├── .claude_settings.json     # Security settings
└── [application files]       # Generated application code
```

## Running the Generated Application

After the agent completes (or pauses), you can run the generated application:

```bash
cd generations/proximity_service

# Run the setup script created by the agent
./init.sh

# Or manually (typical for Node.js apps):
npm install
npm run dev
```

The application will typically be available at `http://localhost:3000` or similar (check the agent's output or `init.sh` for the exact URL).

## Command Line Options

| Option             | Description               | Default                      |
| ------------------ | ------------------------- | ---------------------------- |
| `--project-dir`    | Directory for the project | `./autonomous_demo_project`  |
| `--max-iterations` | Max agent iterations      | Unlimited                    |
| `--model`          | Claude model to use       | `claude-sonnet-4-5-20250929` |

## Customization

### Changing the Application

Edit `prompts/app_spec.txt` to specify a different application to build.

### Adjusting initialization step

Edit `prompts/initializer_prompt.md` to add into / add the initialization process.

### Optional: Seed the database during initialization

Edit `prompts/database_seeding.md` to fetch from external APIs, transform, and load data for test and development environments.

### Modifying Allowed Commands

Edit `security.py` to add or remove commands from `ALLOWED_COMMANDS`.

## Troubleshooting

**"Appears to hang on first run"**
This is normal. The initializer agent is generating detailed test cases, which takes significant time. Watch for `[Tool: ...]` output to confirm the agent is working.

**"Command blocked by security hook"**
The agent tried to run a command not in the allowlist. This is the security system working as intended. If needed, add the command to `ALLOWED_COMMANDS` in `security.py`.

**"API key not set"**
Ensure `ANTHROPIC_API_KEY` is exported in your shell environment.


## License

MIT — see [LICENSE](./LICENSE). Adapted in part from
[anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts) (MIT).
