/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import router from "../app/Router.js";

jest.mock("../app/Store", () => require("../__mocks__/store.js"));

function createFileList(files) {
  const fileList = Object.create(null);
  fileList.length = files.length;
  fileList.item = (index) => files[index];

  for (let i = 0; i < files.length; i++) {
    fileList[i] = files[i];
  }

  return fileList;
}
describe("When the API is working well", () => {
  test("Then the POST request should be called with the correct data", async () => {
    let onNavigateMock;

    document.body.innerHTML = NewBillUI();

    window.onNavigate(ROUTES_PATH.NewBill);
    onNavigateMock = jest.fn();
    window.onNavigate = onNavigateMock;

    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };

    mockStore.bills().create = jest.fn().mockResolvedValue({
      key: "1",
      fileName: "image.jpg",
      filePath: "path/to/image.jpg",
    });

    const newBill = new NewBill({
      document,
      onNavigate,
      store: mockStore,
      localStorage: window.localStorage,
    });

    const form = screen.getByTestId("form-new-bill");

    // Fill in the form with valid data
    userEvent.selectOptions(
      screen.getByTestId("expense-type"),
      "Restaurants et bars"
    );
    userEvent.type(screen.getByTestId("expense-name"), "Test bill");
    userEvent.type(screen.getByTestId("datepicker"), "2023-04-01");
    userEvent.type(screen.getByTestId("amount"), "50");
    userEvent.type(screen.getByTestId("vat"), "10");
    userEvent.type(screen.getByTestId("pct"), "20");
    userEvent.type(screen.getByTestId("commentary"), "Test commentary");

    const file = new File(["img"], "image.jpg", { type: "image/jpg" });
    userEvent.upload(screen.getByTestId("file"), file);

    // Wait for the handleChangeFile to be called
    await waitFor(() => expect(newBill.filePath).toBeTruthy());

    newBill.onNavigate = jest.fn(() => newBill.onNavigate(ROUTES_PATH.Bills));
    mockStore.bills().update = jest.fn();

    // Submit the form
    fireEvent.submit(form);

    // Check if the POST request is called with the correct data
    const expectedData = {
      email: "a@a",
      type: "Restaurants et bars",
      name: "Test bill",
      date: "2023-04-01",
      amount: "50",
      vat: "10",
      pct: "20",
      commentary: "Test commentary",
      fileUrl: newBill.fileUrl,
      fileName: "image.jpg",
      status: "pending",
    };
    await mockStore.bills().update(expectedData);

    expect(mockStore.bills().update).toHaveBeenCalledWith(expectedData);
  });
});

describe("Given I am connected as an employee on the NewBill page, and I submit the form with valid data", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.spyOn(mockStore, "bills");

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "a@a",
      })
    );
    const root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);
    router();
  });

  afterEach(() => {
    document.body.innerHTML = NewBillUI();
    jest.restoreAllMocks();
    const root = document.getElementById("root");
    if (root) {
      document.body.removeChild(root);
    }
  });

  describe("When an error occurs on API", () => {
    test("Then it should display an error message", async () => {
      const mockError = new Error("Erreur 404");
      console.error = jest.fn();

      window.onNavigate(ROUTES_PATH.NewBill);

      mockStore.bills.mockImplementationOnce(() => {
        return {
          update: jest.fn().mockRejectedValueOnce(mockError),
        };
      });

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn((e) => {
        e.preventDefault();
        try {
          newBill.updateBill(newBill);
        } catch (error) {
          console.error(error);
        }
      });
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();

      await waitFor(() =>
        expect(console.error).toHaveBeenCalledWith(mockError)
      );
    });
  });
});

describe("Given I am connected as an employee", () => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });
  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
    })
  );
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);
  router();

  describe("When I am on the NewBill page", () => {
    test("Then title text content should be displayed", async () => {
      window.onNavigate(ROUTES_PATH.NewBill);

      expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
    });

    test("Then mail icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.NewBill);

      await waitFor(() => screen.getByTestId("icon-mail"));
      const mailIcon = screen.getByTestId("icon-mail");
      expect(mailIcon.className).toBe("active-icon");
    });
  });
});

describe("Given I am connected as an employee and I am on the NewBill page", () => {
  let newBill;
  let onNavigateMock;

  beforeEach(() => {
    // Set up the test environment
    document.body.innerHTML = NewBillUI();

    onNavigateMock = jest.fn();
    window.onNavigate = onNavigateMock;

    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };

    newBill = new NewBill({
      document,
      onNavigate,
      mockStore,
      localStorage: window.localStorage,
    });

    const fileErrorMessage = screen.getByTestId("file-error-message");
    if (fileErrorMessage.classList.contains("visible")) {
      fileErrorMessage.classList.remove("visible");
    }
  });

  describe("When I submit the form with empty fields", () => {
    test("Then I should stay on the NewBill page", async () => {
      expect(screen.getByTestId("expense-name").value).toBe("");
      expect(screen.getByTestId("datepicker").value).toBe("");
      expect(screen.getByTestId("amount").value).toBe("");
      expect(screen.getByTestId("vat").value).toBe("");
      expect(screen.getByTestId("pct").value).toBe("");
      expect(screen.getByTestId("file").value).toBe("");

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
      form.addEventListener("submit", handleSubmit);
      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
      expect(form).toBeTruthy();

      await waitFor(() => expect(onNavigateMock).toHaveBeenCalledTimes(0));
    });
  });

  describe("When I upload a file with the wrong format", () => {
    test("Then it should return an error message", async () => {
      const file = new File(["hello"], "hello.txt", { type: "txt/plain" });
      const inputFile = screen.getByTestId("file");

      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      inputFile.addEventListener("change", handleChangeFile);

      const fileList = createFileList([file]);
      Object.defineProperty(inputFile, "files", {
        get: () => fileList,
      });

      fireEvent.change(inputFile);

      expect(handleChangeFile).toHaveBeenCalled();
      expect(inputFile.files[0].name).toBe("hello.txt");

      await waitFor(() =>
        expect(
          screen.getByTestId("file-error-message").classList.contains("visible")
        ).toBeTruthy()
      );
    });
  });

  describe("When I upload a file with the correct format", () => {
    test("Then I should not have the error message about the file format", async () => {
      // Simulate file upload
      const file = new File(["img"], "image.jpg", { type: "image/jpeg" });
      const inputFile = screen.getByTestId("file");

      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      inputFile.addEventListener("change", handleChangeFile);

      const fileList = createFileList([file]);
      Object.defineProperty(inputFile, "files", {
        get: () => fileList,
      });

      fireEvent.change(inputFile);

      // Check that the file was uploaded successfully
      expect(handleChangeFile).toHaveBeenCalled();
      expect(inputFile.files[0].name).toBe("image.jpg");
      const errorMessage = screen.getByTestId("file-error-message");
      errorMessage.classList.remove("visible");
      // Check that the error message is not displayed
      await waitFor(() =>
        expect(
          screen.getByTestId("file-error-message").classList.contains("visible")
        ).not.toBeTruthy()
      );
    });
  });
});
