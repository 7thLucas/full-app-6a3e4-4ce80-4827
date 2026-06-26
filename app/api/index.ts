// Import global routes
import routes from "./routes";
import { initializeModels } from "./models";
import propertiesRouter from "./properties.routes";
import unitsRouter from "./units.routes";
import expensesRouter from "./expenses.routes";

// Initialize models — includes both module models and app models
await initializeModels();

// Register PropLedger-specific routes
routes.use(propertiesRouter);
routes.use(unitsRouter);
routes.use(expensesRouter);

export default routes;
