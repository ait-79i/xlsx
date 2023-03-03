import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import MainPage from "./Components/MainPage";
import Login from "./Components/Login/Login";
import NotFound from "./Components/Login/NotFound";
import "./App.css";
function App() {
	const [Logged, setLogged] = useState(false);
	return (
		<>
			{Logged === false ? (
				<Router>
					<Routes>
						<Route path="/" element={<Login setLogged={setLogged} />} />
						<Route path="*" element={<NotFound />} />
					</Routes>
				</Router>
			) : (
				<Router>
					<Routes>
						<Route path="*" element={<MainPage />} />
					</Routes>
				</Router>
			)}
		</>
	);
}

export default App;
