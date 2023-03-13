import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import MainPage from "./Components/MainPage";
import Login from "./Components/Login/Login";
import RequireAuth from "./Components/RequireAuth";
import APINetwork from "./Components/APINetwork";
import Navbar from "./Components/Navbar/Navbar";
import ModifyJsonStructureComp from "./Components/ModifyJsonStructureComp";
import "./App.css";
import { useState } from "react";

function App() {
	const [bodyRequestData, setBodyRequestData] = useState([]);
	const useAuth = () => {
		const token = localStorage.getItem("token");
		if (!token || token === undefined) {
			return false;
		} else {
			return true;
		}
	};

	const logged = useAuth();

	return (
		<Router>
			<Navbar logged={logged} />
			<Routes>
				{/* Public routes */}
				<Route
					path="/login"
					element={logged === false ? <Login /> : <Navigate to="/" />}
				/>
				<Route path="/" element={<h1>Home </h1>} />
				<Route path="/support" element={<h1>Contact Us</h1>} />
				{/* Protected routes */}
				<Route element={<RequireAuth />}>
					<Route
						path="/excel-to-json"
						element={<MainPage setBodyRequestData={setBodyRequestData} />}
					/>
					<Route
						path="/json-structure"
						element={
							<ModifyJsonStructureComp setBodyRequestData={setBodyRequestData} />
						}
					/>
					<Route
						path="/test-api"
						element={<APINetwork bodyRequestData={bodyRequestData} />}
					/>
				</Route>
				{/* Catsh all  */}
				<Route path="*" element={<h1> Not Found</h1>} />
			</Routes>
		</Router>
	);
}

export default App;
