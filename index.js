import * as core from "@actions/core";
import * as github from "@actions/github";
import { GenerativeModel } from "@google/generative-ai";

const getPullRequestNumber = (ref) => {
    core.debug(`[GeminiAction]  Parsing ref: ${ref}`);
    const prNumber = ref.replace(/refs\/pull\/(\d+)\/merge/, `$1`);
    return parseInt(prNumber, 10);
};

const availableIssuesLabels = async (issuesNumber, owner, repo, octokit) => {
    const { 
        data 
    } = await octokit.rest.issues.listLabelsOnIssue({
        owner,
        repo,
        issue_number: issuesNumber
    });
    if (data.length === 0) {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issuesNumber,
            body: `:octopus: No Labels Found in this PR. Please add at least one of these labels: ${JSON.stringify(data.labels, null, 2)}`
        });
        return [];
    }
    // Return Data Map Lable and Avoid Undefine Labels
    return data.map((label) => label.name).filter((label) => label !== undefined);
};

(async () => {
    try {
        const geminiModel = 'gemini-pro';
        const owner = github.context.repo.owner;
        const repo = github.context.repo.repo;
        const apiKey = core.getInput("gemini-api-key");
        const githubToken = core.getInput("github-token");
        const ref = github.context.ref;
        const octokit = github.getOctokit(githubToken);
        const pullRequestNumber = getPullRequestNumber(ref);
        await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number: github.context.issue.number,
            assignees: [github.context.actor]
        });
        core.debug(`[GeminiAction]  Ref: ${ref} : getPullRequestNumber(ref) => ${pullRequestNumber.number}`)
        const prNumber = github.context.issue.number || getPullRequestNumber(ref);
        const model = new GenerativeModel(apiKey, {
            model: geminiModel,
            generationConfig: { temperature: 0 },
        });
        core.debug(`[GeminiAction]  Found PR number: ${github.context.issue.number}`);
        const available = await availableIssuesLabels(prNumber, owner, repo, octokit);
        core.debug(`[GeminiAction]  available number: ${available.number}`);
        const issue = await octokit.rest.issues.get({
            ...github.context.issue,
            issue_number: github.context.issue.number,
        });
        const availableLabels = await octokit.rest.issues.listLabelsForRepo({
            ...github.context.repo,
        });
        const prompt = `
        You have a role to manage a GitHub repository. Given an issue/pull request information (subject and body), choose suitable labels to it from the labels available for the repository.
    
        Use the following format:
        LABELS: "the names of the chosen labels, each name must not be surrounded double quotes, separated by a comma"
    
        Only use the following labels:
        \`\`\`
        ${JSON.stringify(availableLabels.data, null, 2)}
        \`\`\`
    
        ## ISSUE/PULL REQUEST ##
        SUBJECT: ${issue.data.title}
        BODY: ${issue.data.body}
      `;
        core.debug(`Prompt: ${prompt}`);
        const completion = await model.generateContent(prompt);
        core.debug({ completion });
        let labels = /LABELS\: (.+)/g.exec(completion.response.text());
        if (labels) {
            labels = labels[1].trim().split(/,\s*/);
            await octokit.rest.issues.setLabels({
                owner: github.context.issue.owner,
                repo: github.context.issue.repo,
                issue_number: github.context.issue.number,
                labels,
            });
        } else {
            core.setFailed(
                `Failed to propose labels: completion=${completion.data.choices[0].text}`,
            );
        }
    } catch (error) {
        core.setFailed(`Error Message: ${error.stack}`);
    }
})();
