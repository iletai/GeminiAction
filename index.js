import * as core from "@actions/core";
import * as github from "@actions/github";
import { GenerativeModel } from "@google/generative-ai";

async function run() {
    const apiKey = core.getInput("gemini-api-key");
    const githubToken = core.getInput("github-token");
    const prTemplate = await github.context.repo;
    const octokit = github.getOctokit(githubToken);
    const issue = await octokit.rest.issues.get({
        ...github.context.issue,
        issue_number: github.context.issue.number,
      });
    const availableLabels = await octokit.rest.issues.listLabelsForRepo({
    ...github.context.repo,
    }); 
    const availablePullRequests = await octokit.rest.pulls.list({
        ...github.context.repo,
    });
    const firstPullRequest = availablePullRequests.data[0];
    const pullRequest = await octokit.rest.pulls.get({
        ...github.context.repo,
        pull_number: firstPullRequest.number,
    });
    // Comment Pull Request
    await octokit.rest.issues.createComment({
        ...github.context.repo,
        issue_number: pullRequest.data.number,
        body: "Hello from Gemini!",
    });
    console.log(prTemplate);
    console.log(availableLabels);
    console.log(issue); 
}

run();
