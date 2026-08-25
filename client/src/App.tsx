import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { AcademiaCover } from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Lapis from "./pages/Lapis";
import Prereg from "./pages/Prereg";
import { MatchmakerPage, VigilPage } from "./pages/PublicationTools";
import { AnalystPage, ScriptoriumPage, VaultPage } from "./pages/ResearchTools";
import QualiaWorkspacePage from "./pages/QualiaWorkspace";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/acesso"} component={AcademiaCover} />
      <Route path={"/projects"} component={Home} />
      <Route path={"/search"} component={Home} />
      <Route path={"/discover"} component={Home} />
      <Route path={"/library"} component={Home} />
      <Route path={"/synthesis"} component={Home} />
      <Route path={"/lapis"} component={Lapis} />
      <Route path={"/prereg"} component={Prereg} />
      <Route path={"/vault"} component={VaultPage} />
      <Route path={"/qualia"} component={QualiaWorkspacePage} />
      <Route path={"/analista"} component={AnalystPage} />
      <Route path={"/scriptorium"} component={ScriptoriumPage} />
      <Route path={"/matchmaker"} component={MatchmakerPage} />
      <Route path={"/vigil"} component={VigilPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
