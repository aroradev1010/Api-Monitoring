import config from "./config";
import { connectDB } from "./services/db";
import logger from "./logger";
import app from "./app"; // <-- import your new Express app

const port = config.PORT;

connectDB()
  .then(() => {
    app.listen(port, () => {
      logger.info(
        { port },
        `Ingest service running on http://localhost:${port}`
      );
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect DB");
    process.exit(1);
  });
