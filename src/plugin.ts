import { Plugin, ViteDevServer } from "vite";
import express, { Request, Response } from "express";
import cors from "cors";
import { serverFns } from "./fn";
import fs from "fs";
import path from "path";
import chokidar from "chokidar";

type ServerFunction = () => Promise<any>;

export function queryProxy(): Plugin {
  let outputDir: string;

  function writeServerFunctions() {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    serverFns.forEach((fn, fnName) => {
      const functionContent = `
        export default function handler(req, res) {
         const ${fnName} = ${fn};

         ${fnName}(req, res)
        };
      `;
      fs.writeFileSync(
        path.join(outputDir, `${fnName}.js`),
        functionContent.trim()
      );
    });
  }

  return {
    name: "query-proxy",

    configureServer(server: ViteDevServer) {
      outputDir = path.resolve(server.config.root, "api/serverFn");

      // Write server functions initially
      writeServerFunctions();

      // Watch for changes in the fn file
      const watcher = chokidar.watch(
        path.resolve(server.config.root, "fn.ts"),
        {
          persistent: true,
        }
      );

      watcher.on("change", () => {
        console.log("Server functions changed, updating files...");
        writeServerFunctions();
      });

      // Development middleware setup
      const app = express();

      app.use(
        cors({
          origin: "*",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        })
      );

      // Set up routes for development
      serverFns.forEach((fn, fnName) => {
        app.get(
          `/api/serverFn/${fnName}`,
          async (req: Request, res: Response) => {
            try {
              const result = await fn();
              res.json(result);
            } catch (error) {
              console.error(
                `Error executing server function ${fnName}:`,
                error
              );
              res.status(500).json({ error: (error as Error).message });
            }
          }
        );
      });

      server.middlewares.use(app);
    },

    buildEnd() {
      // This will run for production builds
      // outputDir = path.resolve(process.cwd(), "api/serverFn");
      // writeServerFunctions();
    },
  };
}
