const ORDER_URL = "http://localhost:5004";

function getOrderHeaders() {

    const token = localStorage.getItem("staff_token");

    console.log("ORDER TOKEN =", token);

    return {
        "Content-Type": "application/json",
        ...(token
            ? { Authorization: `Bearer ${token}` }
            : {})
    };
}


// GET
globalThis.orderGet = async function(path) {

    try {

        const response = await fetch(
            ORDER_URL + path,
            {
                method: "GET",
                headers: getOrderHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {

            return {
                success: false,
                message:
                    data.message ||
                    "Lỗi " + response.status
            };
        }

        return data;

    }
    catch (err) {

        console.error("orderGet error:", err);

        return {
            success: false,
            message: "Không kết nối được Order Service"
        };
    }
};



// POST
globalThis.orderPost = async function(path, body = {}) {

    try {

        const response = await fetch(
            ORDER_URL + path,
            {
                method: "POST",
                headers: getOrderHeaders(),
                body: JSON.stringify(body)
            }
        );

        const data = await response.json();

        if (!response.ok) {

            return {
                success: false,
                message:
                    data.message ||
                    "Lỗi " + response.status
            };
        }

        return data;

    }
    catch (err) {

        console.error("orderPost error:", err);

        return {
            success: false,
            message: "Không kết nối được Order Service"
        };
    }
};



// PUT
globalThis.orderPut = async function(path, body = {}) {

    try {

        const response = await fetch(
            ORDER_URL + path,
            {
                method: "PUT",
                headers: getOrderHeaders(),
                body: JSON.stringify(body)
            }
        );

        const data = await response.json();

        if (!response.ok) {

            return {
                success: false,
                message:
                    data.message ||
                    "Lỗi " + response.status
            };
        }

        return data;

    }
    catch (err) {

        console.error("orderPut error:", err);

        return {
            success: false,
            message: "Không kết nối được Order Service"
        };
    }
};