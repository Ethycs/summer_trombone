import { exec } from 'child_process';

export function runScriptsPlugin() {
    return {
        name: 'run-scripts',
        configureServer(server) {
            if (process.argv.includes('--run-scripts')) {
                console.log('Running scripts...');
                const script = exec('node .github/scripts/generate-summaries.mjs');

                script.stdout.on('data', (data) => {
                    console.log(`[scripts] ${data}`);
                });

                script.stderr.on('data', (data) => {
                    console.error(`[scripts] ${data}`);
                });

                script.on('close', (code) => {
                    console.log(`[scripts] exited with code ${code}`);
                });
            }
        },
    };
}
