import { render } from "preact";
import { LocationProvider, Router, Route } from "preact-iso";

import { Sim } from "./pages/Sim/index.jsx";
import { Designer } from "./pages/Designer/index.jsx";
import { NotFound } from "./pages/_404.jsx";
import "./style.css";

export function App() {
    return (
        <LocationProvider>
            <main>
                <Router>
                    <Route path="/" component={Sim} />
                    <Route path="/designer" component={Designer} />
                    <Route default component={NotFound} />
                </Router>
            </main>
        </LocationProvider>
    );
}

render(<App />, document.querySelector("#app"));
