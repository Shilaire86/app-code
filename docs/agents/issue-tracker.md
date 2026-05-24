# Issue tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues. Use the `gh` CLI for all issue-tracker operations.

## Conventions

- Create an issue with `gh issue create --title "..." --body "..."`.
- Read an issue with `gh issue view <number> --comments`.
- List issues with `gh issue list`, adding any needed `--state` or `--label` filters.
- Comment on an issue with `gh issue comment <number> --body "..."`.
- Apply labels with `gh issue edit <number> --add-label "..."`.
- Remove labels with `gh issue edit <number> --remove-label "..."`.
- Close an issue with `gh issue close <number> --comment "..."`.

Run these commands from inside the repository clone so `gh` can infer the repo from `git remote -v`.

## Skill behavior

- When a skill says "publish to the issue tracker", create a GitHub issue.
- When a skill says "fetch the relevant ticket", use `gh issue view <number> --comments`.
