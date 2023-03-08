import React from "react";
import ReactDOM from "react-dom/client";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
// import { AuthProvider } from "./context/AuthProvider";
import { Auth0Provider } from "@auth0/auth0-react";

const domain = "dev-i5wkwrwesb7pjvzq.eu.auth0.com";
const clientId = "OeC7SX63J9NSiqhWNjtyJlshPLcOGiDB";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
