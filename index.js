import * as core from "@actions/core";
import * as github from "@actions/github";
import { GenerativeModel } from "@google/generative-ai";

async function run() {
    // Read file pull request template from github repo
    const prTemplate = await github.context.repo;
    console.log(prTemplat);
}

run();
