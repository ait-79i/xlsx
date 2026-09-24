import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import MainPage from "./Components/MainPage";
import Login from "./Components/Login/Login";
import RequireAuth from "./Components/RequireAuth";
import APINetwork from "./Components/apiRequests/APINetwork";
import ModifyJsonStructureComp from "./Components/ModifyJsonStructureComp";
import "./App.css";
import { lazy, Suspense, useState } from "react";
import { useAuth } from "./Components/CommanFunctions";
import Home from "./home/Home";
import NotFound from "./Components/NotFound";
import { useTranslation } from "react-i18next";
import { useSessionState } from "./utils/useSessionState";

// React Flow is only loaded when the visualizer is opened
const VisualizerPage = lazy(() =>
	import("./Components/Visualizer/VisualizerPage")
);

function App() {
	const [bodyRequestData, setBodyRequestData] = useState({});
	// data shown in the visualizer, kept across page reloads
	const [visualData, setVisualData] = useSessionState("visualData", null);

	const logged = useAuth();
	const { t } = useTranslation();

	return (
		<Router>
			<Routes>
				{/* Public routes */}
				<Route
					path="/login"
					element={logged === false ? <Login /> : <Navigate to="/" />}
				/>
				<Route path="/" element={<Home />} />
				<Route path="/support" element={<h1>{t("nav.contactUs")}</h1>} />
				{/* Protected routes */}
				<Route element={<RequireAuth />}>
					<Route
						path="/excel-to-json"
						element={
							<MainPage
								setBodyRequestData={setBodyRequestData}
								setVisualData={setVisualData}
							/>
						}
					/>
					<Route
						path="/json-structure"
						element={
							<ModifyJsonStructureComp
								setBodyRequestData={setBodyRequestData}
								setVisualData={setVisualData}
							/>
						}
					/>
					<Route
						path="/test-api"
						element={
							<APINetwork
								bodyRequestData={bodyRequestData}
								setVisualData={setVisualData}
							/>
						}
					/>
					<Route
						path="/visualizer"
						element={
							<Suspense fallback={<p className="p-3">{t("loading")}</p>}>
								<VisualizerPage data={visualData} setData={setVisualData} />
							</Suspense>
						}
					/>
				</Route>
				{/* Catsh all  */}
				<Route path="*" element={<NotFound />} />
			</Routes>
		</Router>
	);
}

export default App;
