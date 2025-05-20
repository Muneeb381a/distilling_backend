class ApiResponse {
    constructor(res, statusCode, message, data) {
        this.res = res;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data
    }

    send() {
        return this.res.status(this.statusCode).json({
            success: true,
            message: this.message,
            data: this.data
        })
    }
}

export {ApiResponse}