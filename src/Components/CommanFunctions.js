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

export const useAuth = () => {
	const token = localStorage.getItem("token");
	if (!token || token === undefined) {
		return false;
	} else {
		return true;
	}
};

export function updateObjectInArray(array, index, newKey, newValue) {
	const newArray = [...array];
	const objectToUpdate = {};
	// delete newArray[index];
	objectToUpdate[newKey] = newValue;
	newArray.splice(index, 1, objectToUpdate);
	return newArray;
}

export const disableinputs = (method) => {
	if (method === "GET" || method === "DELETE") {
		const fieldsetList = document.getElementsByTagName("fieldset");
		for (var i = 0; i < fieldsetList.length; i++) {
			fieldsetList[i].disabled = true;
		}
	} else {
		const fieldsetList = document.getElementsByTagName("fieldset");
		for (var i = 0; i < fieldsetList.length; i++) {
			fieldsetList[i].disabled = false;
		}
	}
};
