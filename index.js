import * as core from "@actions/core";
import * as github from "@actions/github";
import { GenerativeModel } from "@google/generative-ai";

// Define the valid parity labels.
// Get Pull Request Number From Ref Revision
const getPullRequestNumber = (ref) => {
    core.debug(`[GeminiAction]  Parsing ref: ${ref}`);
    // This assumes that the ref is in the form of `refs/pull/:prNumber/merge`
    const prNumber = ref.replace(/refs\/pull\/(\d+)\/merge/, `$1`);
    return parseInt(prNumber, 10);
};

(async () => {
    try {
        const owner = github.context.repo.owner;
        const repo = github.context.repo.repo;
        const apiKey = core.getInput("gemini-api-key");
        const githubToken = core.getInput("github-token");
        const ref = github.context.ref;
        const octokit = github.getOctokit(githubToken);
        const pullRequestNumber = getPullRequestNumber(ref);
        // Assigne Issues for Owner Repo
        await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number: github.context.issue.number,
            assignees: [github.context.actor]
        });

        // Create branch base on this Issues and link it to issues.
        await octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/issue-${github.context.issue.number}`,
            sha: github.context.sha
        });
        core.debug(`[GeminiAction]  Ref: ${ref} : getPullRequestNumber(ref) => ${pullRequestNumber.number}`)
        const prNumber = github.context.issue.number || getPullRequestNumber(ref);
        const model = new GenerativeModel(apiKey, {
            model: "gemini-pro",
            generationConfig: { temperature: 0 },
        });
        const availableIssuesLabels = async (issuesNumber) => {
            const { data } = await octokit.rest.issues.listLabelsOnIssue({
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
            return data.labels.map((label) => label.name);
        };
        core.debug(`[GeminiAction]  Found PR number: ${github.context.issue.number}`);
        const available = availableIssuesLabels(prNumber);
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
        // if (prValidLabels.length > 0) {
        //     core.info(`OK: Pull Request has at least one parity label.`);
        // }
        // else {
        //     core.error(`Missing parity label: The PR should have at least one of these labels: ${prValidLabels.join(`, `)}`);
        //     throw `[GeminiAction] No labels exist in the PR. Please add at least one of these labels: ${prValidLabels.join(`, `)}`;
        // }
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
