import axios from "axios";
import { describe, expect, it } from "vitest";
import { apiErrorMessage, apiErrorStatus } from "./api-error";

describe("apiErrorMessage", () => {
  it("extracts NestJS string message from Axios response", () => {
    const error = new axios.AxiosError(
      "Request failed with status code 400",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as never,
        data: {
          message: "تاریخ 1405/05/19 خارج از سال مالی 1403 است",
          error: "Bad Request",
          statusCode: 400,
        },
      },
    );
    expect(apiErrorMessage(error, "fallback")).toBe(
      "تاریخ 1405/05/19 خارج از سال مالی 1403 است",
    );
  });

  it("joins NestJS validation message arrays", () => {
    const error = new axios.AxiosError(
      "Request failed with status code 400",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as never,
        data: { message: ["خطای اول", "خطای دوم"], statusCode: 400 },
      },
    );
    expect(apiErrorMessage(error, "fallback")).toBe("خطای اول، خطای دوم");
  });

  it("uses fallback instead of Axios status text", () => {
    const error = new axios.AxiosError(
      "Request failed with status code 500",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      {
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: {} as never,
        data: {},
      },
    );
    expect(apiErrorMessage(error, "خطای سرور")).toBe("خطای سرور");
  });

  it("returns Error.message for non-Axios errors", () => {
    expect(apiErrorMessage(new Error("مشکل محلی"), "fallback")).toBe(
      "مشکل محلی",
    );
  });
});

describe("apiErrorStatus", () => {
  it("returns HTTP status from Axios errors", () => {
    const error = new axios.AxiosError(
      "Request failed with status code 429",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 429,
        statusText: "Too Many Requests",
        headers: {},
        config: {} as never,
        data: {},
      },
    );
    expect(apiErrorStatus(error)).toBe(429);
  });
});
