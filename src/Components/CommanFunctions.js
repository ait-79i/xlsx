import { useEffect } from "react";

function changeKeysOfNestedObject(obj, oldKey, newKey) {
	const newObj = {};
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === "object") {
			newObj[key] = changeKeysOfNestedObject(value, oldKey, newKey);
		} else if (key === oldKey) {
			newObj[newKey] = value;
		} else {
			newObj[key] = value;
		}
	}
	return newObj;
}

export const changeJsonKeys = (data, oldName, newName) => {
	var newdt = [];
	data.map(
		(obj) => (newdt = [...newdt, changeKeysOfNestedObject(obj, oldName, newName)])
	);
	return [...newdt];
};

export const validateFile = (fname) => {
	var re = /(\.xlsx|\.xlsm|\.xlsb|\.xls|\.xlam)$/i;
	if (!re.exec(fname)) {
		return false;
	}
	return true;
};

export const PreventReload = () => {
	useEffect(() => {
		const unloadCallback = (event) => {
			event.preventDefault();
			event.returnValue = "";
			return "";
		};
		window.addEventListener("beforeunload", unloadCallback);
		return () => window.removeEventListener("beforeunload", unloadCallback);
	}, []);
};
