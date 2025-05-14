# Testing Documentation

## Overview
This directory contains tests for the Planetz backend application. We use pytest as our testing framework.

## Directory Structure
```
tests/
├── __init__.py
├── test_app.py        # Basic application tests
└── README.md         # This file
```

## Running Tests
To run all tests:
```bash
pytest
```

To run specific test files:
```bash
pytest backend/tests/test_app.py
```

To run tests with coverage:
```bash
pytest --cov=backend
```

## Testing Conventions
1. All test files should be named `test_*.py` or `*_test.py`
2. Use fixtures for common setup
3. Group tests by functionality
4. Write descriptive test names and docstrings

## Adding New Tests
1. Create a new test file in the appropriate directory
2. Import necessary fixtures from `conftest.py`
3. Follow the existing test patterns
4. Include both positive and negative test cases 