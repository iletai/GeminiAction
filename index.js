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
        const prNumber = github.context.issue.number || getPullRequestNumber(ref);
        const model = new GenerativeModel(apiKey, {
            model: "gemini-pro",
            generationConfig: { temperature: 0 },
        });
        const availableIssuesLabels = async (issuesNumber) => {
            const { data } = await octokit.rest.issues.listLabelsOnIssue({
                issue_number: issuesNumber,
                owner,
                repo,
            });
            if (data.length === 0) {
                throw new Error(`[GeminiAction]  No Issues found for ${issuesNumber} (${ref}).`);
            }
            return data.labels.map((label) => label.name);
        };
        const issue = await octokit.rest.issues.get({
            ...github.context.issue,
            issue_number: github.context.issue.number,
        });

        const availableLabels = await octokit.rest.issues.listLabelsForRepo({
            ...github.context.repo,
        });
        // const getPrLabels = async (prNumber) => {
        //     try {
        //         const { data } = await octokit.rest.pulls.get({
        //             owner,
        //             repo,
        //             pull_number: prNumber
        //         });
        //         return data.labels
        //         return data.labels.map((label) => label.name);
        //     } catch (error) {
        //         if (error.status === 404) {
        //             return [];
        //         }
        //         throw new Error(`Error retrieving PR labels: ${error.message}`);
        //     }
        // };

        // const prLabels = await getPrLabels(prNumber);
        // core.debug(`[GeminiAction] Found PR labels: ${prLabels.toString()}`);
        // Get the valid parity labels in this pull request.
        // const prValidLabels = prLabels.filter(value => getPrLabels.includes(value));
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
