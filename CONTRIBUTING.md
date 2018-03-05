# Contributing

## Introduction

First of all, thank you for thinking about contributing to this project and even reading this contribution guide. That is very kind of you.

We're always open for contributions!

To ensure a quick response, a clean code and a high level of test coverage we kindly ask you to follow these guidelines.

## I found a bug!

Oh no! That shouldn't happen, but we're only human so please bear with us. We'd like to smash that insect as fast as possible!

To report your finding, please open a new issue in our Github repository and specify the steps you took when you encountered the bug as detailed as possible. Also, if applicable, please describe the environment (OS version, software version, etc.) as it can help us to reproduce the error.

Thanks for your time!

## I'd like a new feature!

Great! Thanks for thinking about new ways for using our software.

Please describe what you're currently missing and what the use case of the missing feature would be. If you can, please add examples on how you would use the new feature. Please go into as much detail as possible.

Sometimes a new feature may be out of our intended scope, so we might decline your feature suggestion. Sorry. But, as we're completely open, you might just create a new software for the feature, that uses our software as a backend.

Thank you for your idea!

## I'd like to help to smash a bug or implement a new feature!

Woah, great! Thank you for your support.

Please make sure, that the bug or feature you'd like to work on is already reported and has a `needs-pr` label attached. This will make sure that we saw, analyzed and approved the issue.

Then fork our repository and clone it. Create a new branch in the fork and work in that branch. You can choose any name you like, but we suggest using the number of the referenced issue somewhere.

We're trying to stick to the test driven development paradigm, so please add a test first, that either identifies the bug or tries to use the missing feature. Run the test suite. The test should fail.

Then, fix the bug or implement the feature and run the test again. It should turn green.

Use the provided grunt task `test` to test the code. It will also check your code against our coding standards.

When you're done, please take a look at the code coverage report in test/coverage/reports/lcov-report/index.html and check, that your test generated enough coverage.

After you're done, commit your work using a referencing commit comment (something like "fixes #2") and create a pull request.

We will review your pull request, maybe ask you some details and finally accept it.

Again, thank you for your support and hard work! We appreciate it.
