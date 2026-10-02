import { createRoot } from "react-dom/client";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { GameRoot } from "./components/game/GameRoot";
import { GameDisclaimer } from "./components/game/GameDisclaimer";
import { PreviewHostBridge } from "./components/preview-host-bridge";
import { AuthProvider } from "./lib/auth/provider";
import { AppErrorComponent } from "./lib/error-component";
import "./styles.css";

const root = createRootRoute({component:()=> <><PreviewHostBridge/><AuthProvider><Outlet/></AuthProvider><GameDisclaimer/></>});
const home = createRoute({getParentRoute:()=>root,path:"/",component:GameRoot});
const router = createRouter({routeTree:root.addChildren([home]),history:createMemoryHistory({initialEntries:["/"]}),defaultErrorComponent:AppErrorComponent});
createRoot(document.getElementById("desktop-root")!).render(<RouterProvider router={router}/>);
