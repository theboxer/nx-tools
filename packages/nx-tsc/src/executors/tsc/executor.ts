import { TscExecutorSchema } from './schema';
import { ExecutorContext } from '@nrwl/devkit';
import { exec } from 'child_process';
import { resolve, join } from 'path';

export const LARGE_BUFFER = 1024 * 1000000;
const executable = resolve('node_modules', '.bin', 'tsc');

const runTsc = async (options: TscExecutorSchema, ctx: ExecutorContext) => {
  const tsConfigFilePath = options.tsConfig ? options.tsConfig : generateTsConfigPath(ctx);
  const tsBuildInfoFilePath = options.tsBuildInfoFile
    ? options.tsBuildInfoFile
    : generateTsBuildInfoFilePath(ctx);

  const result = await createProcess(
    `${executable} --noEmit --pretty --incremental --tsBuildInfoFile ${tsBuildInfoFilePath} -p ${tsConfigFilePath}`,
  );

  if (!result) {
    return {
      success: false,
    };
  }

  return {
    success: true,
  };
};

const generateTsConfigPath = (ctx: ExecutorContext): string => {
  const projectRoot = ctx.workspace.projects[ctx.projectName].root.split('/');
  const projectRootDir = projectRoot.shift();

  const tsConfigFile = `tsconfig${projectRootDir === 'libs' ? '.lib' : ''}.json`;
  return `${join(ctx.root, ctx.workspace.projects[ctx.projectName].root)}/${tsConfigFile}`;
};

const generateTsBuildInfoFilePath = (ctx: ExecutorContext): string => {
  return `${ctx.root}/.tsc/${ctx.projectName}.tsbuildinfo`;
};

const createProcess = (command: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const childProcess = exec(command, {
      maxBuffer: LARGE_BUFFER,
    });

    const processExitListener = () => childProcess.kill();

    process.on('exit', processExitListener);
    process.on('SIGTERM', processExitListener);

    childProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    childProcess.stderr.on('data', (err) => {
      process.stderr.write(err);
    });

    childProcess.on('exit', (code) => {
      resolve(code === 0);
    });
  });
};

export default runTsc;
