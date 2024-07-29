import { exec } from "child_process";
import { promises as fs } from "fs";
const DESTINATION_FOLDER = "./packed";

type Dependency = {
  version?: string;
  resolved?: string;
  integrity?: string;
  requires?: { [key: string]: string };
  dependencies?: Dependencies;
  optionalDependencies?: Dependencies;
};

type Dependencies = { [key: string]: Dependency };

type Output = {
  name: string;
  version: string;
  dependencies?: Dependencies;
};

const execCommand = (command: string) =>
  new Promise<string>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject("Execution error: " + error.message);
        return;
      }
      resolve(stdout);
    });
  });

const countDependencies = async () => {
  const output = await execCommand("npm ls -a --omit dev -p");
  return output.split("\n").length;
};

const getDependencies = async () => {
  const output = await execCommand("npm ls -a --omit dev --json");
  const { dependencies } = JSON.parse(output) as Output;
  if (!dependencies) {
    throw new Error("No dependencies found");
  }
  return dependencies;
};

const createFolder = async (path: string) => {
  try {
    await fs.access(path);
    await fs.rm(path, { recursive: true, force: true });
  } catch (error) {
  } finally {
    await fs.mkdir(path);
  }
};

const packDependency = async (
  name: string,
  version: string | undefined,
  index: number
) => {
  try {
    await execCommand(
      `npm pack ${name}${
        version ? "@" + version : ""
      } --pack-destination ${DESTINATION_FOLDER}`
    );

    console.log(`> [${index}]: ${name}${version ? ":" + version : ""}`);
  } catch (error) {
    console.error("Failed to pack " + name);
    console.error(error);
  }
};

const packAllDependencies = async () => {
  let index = 0;
  const spinner = ["|", "/", "-", "\\"];
  const packedDependencies = new Set<string>();
  const promises: Promise<void>[] = [];

  const promiseToPack = (dependencies: Dependencies) => {
    for (const name in dependencies) {
      process.stdout.write("\r");
      process.stdout.write(
        "Recursively analysing dependencies ... " + spinner[index]
      );
      index = (index + 1) % spinner.length;
      if (!packedDependencies.has(name)) {
        const {
          version,
          dependencies: subDependencies,
          optionalDependencies,
        } = dependencies[name];
        promises.push(packDependency(name, version, promises.length + 1));
        if (subDependencies) {
          promiseToPack(subDependencies);
        }
        if (optionalDependencies) {
          promiseToPack(optionalDependencies);
        }
      }
    }
  };

  console.log("Preparing to pack ...");

  const [dependencies] = await Promise.all([
    getDependencies(),
    countDependencies(),
    createFolder(DESTINATION_FOLDER),
  ]);
  process.stdout.write("Recursively analysing dependencies ... ");
  promiseToPack(dependencies);
  process.stdout.write("\r");
  console.log("Recursive analysis complete!");
  console.log(`Packing ${promises.length} dependencies. Please wait ...`);

  await Promise.all(promises);

  console.log(`${promises.length} dependencies packed`);
};

packAllDependencies();
