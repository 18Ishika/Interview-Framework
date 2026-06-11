# core/utils/api_response.py

from rest_framework.response import Response


def success_response(
    data=None,
    message="Success",
    code="SUCCESS",
    status_code=200
):
    return Response(
        {
            "success": True,
            "code": code,
            "message": message,
            "data": data
        },
        status=status_code
    )


def error_response(
    errors=None,
    message="Something went wrong",
    code="ERROR",
    status_code=400
):
    return Response(
        {
            "success": False,
            "code": code,
            "message": message,
            "errors": errors
        },
        status=status_code
    )