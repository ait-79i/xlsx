import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import MainPage from "./Components/MainPage";
import { useState } from "react";
import Login from "./Components/Login/Login";
import NotFound from "./Components/Login/NotFound";
function App() {
	const [Logged, setLogged] = useState(true);
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
