## INITIALIZER AGENT (Session 1 of many)

You are the first agent in long-running process of Test Driven Development.
You will write executable functional test for server and style test for UI.
The test will fail after you run it, subsequent agent will complete developlement
by making the test pass one by one.

### FIRST: Read the Project Specification

Start by reading `app_spec.txt` in your working directory. This file contains
the complete specification for what you need to build. Read it carefully
before proceeding.

### SECOND: Seed the database

If `data/migration.sql` is present inside working directory, please **skip** this step.

Read `database_seeding.md` in your working directory. If this file does not exist, skip this task.
Local postgresql is running below.
postgres://postgres:postgrespw@localhost:55000

Please generate a clean, reproducible setup for my project contributors by doing the following
- Create `data/migration.sql` include schema, extension suitable for any or Linux/MacOS machine
- Also insert the mocks created
- Write a summary of this step into working directory

### IMPORTANT THIRD TASK: WRITE FUNCTIONAL TEST

Based on `app_spec.txt` and `data/migration.sql` from the previous step,
please write 10 backend functional test and 10 detailed end-to-end (from frontend app) functional tests inside project directory `functional_tests`.
with summary file of the tests in JSON format `functional_tests_summary.json`.

You can have multiple files based on logical grouping.
You also need to assign priority "P1" or "P2", "P3".
Core functionalities of application, important utilities functions are P1; 
P2 and P3 are not very critical; P2 functionality can be the baseline of P3 ones.
If some APIs other P3 cases have dependency on, those are marked P2 and will need to be developed first.

You can read and write into Database before each test, so test execution will not depend on previous data.

Run these tests and the results will be `FAIL` at this point of time. The summary file should indicate the status correctly.

**Format of summary file:**
```json
[
  {
    "priority": "P1",
    "category": "backend",
    "test_file_name": "search_nearby_with_semantic_reranking.test.ts",
    "api": "/api/search/nearby?lat=34.0522&lon=-118.2437&preference=quiet%20cafe%20suitable%20to%20work%20alone%20with%20laptop%20and%20good%20wifi&radius=1&count=1",
    "description": "Return cafe within 1 km which has good WiFI which allows studying",
    "method": "GET",
    "request_payload": {},
    "response_payload": {},
    "status": "FAIL",
    "_comment": "Implementation agent set status to PASS when done"
  },
  {
    "priority": "P2",
    "category": "backend",
    "test_file_name": "add_new_business.test.ts",
    "api": "/v1/business/:id",
    "method": "GET",
    "request_payload": {},
    "response_payload": {},
    "status": "FAIL",
    "_comment": "Implementation agent set status to PASS when done"
  }
]
```

### FOURTH TASK: Create Project Structure

Set up the basic project structure based on what's specified in `app_spec.txt`.
This typically includes directories for frontend, backend, and any other
components mentioned in the spec.
**Important** To include DB migration script in the backend application for easy access to the seed data in the earlier task.
So that application and test can work with sample data.


### FIFTH TASK: Create init.sh
Create a script called `init.sh` that future agents can use to quickly
set up and run the development environment. The script should:

1. Install any required dependencies
2. Start any necessary servers or services
3. Print helpful information about how to access the running application

Base the script on the technology stack specified in `app_spec.txt`.


### FINAL TASK

Before your context fills up / after you completed other task:
1. Create `claude-progress.txt` in working directory, with a summary of what you accomplished
2. Ensure `functional_tests_summary.json` in `functional_tests` folder is complete and saved


The next agent will continue from here.


