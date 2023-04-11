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

jest.mock("../app/store", () => mockStore);

function createFileList(files) {
  const fileList = Object.create(null);
  fileList.length = files.length;
  fileList.item = (index) => files[index];

  for (let i = 0; i < files.length; i++) {
    fileList[i] = files[i];
  }

  return fileList;
}


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

  describe("When I am on the NewBill page and I submit the form with empty fields", () => {
    test("Then I should stay on the NewBill page", () => {
      const onNavigateMock = jest.fn();
      window.onNavigate = onNavigateMock;
      window.onNavigate(ROUTES_PATH.NewBill);

      const newBill = new NewBill({
        document,
        onNavigate: window.onNavigate,
        mockStore,
        localStorage: window.localStorage,
      });

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
      expect(onNavigateMock).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });
  });

  describe("When I am on the NewBill page and I upload a file with the wrong format", () => {
    test("Then it should return an error message", async () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        mockStore,
        localStorage: window.localStorage,
      });

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
      expect(inputFile.files[0].type).toBe("txt/plain");

      await waitFor(() =>
        expect(
          screen.getByTestId("file-error-message").classList).toContain("visible")
      );
    });
  });

  describe("When I am on the NewBill page and I upload a file with the good format", () => {
    test("Then I should not have the error message about the file format", async () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const file = new File(["img"], "image.jpg", { type: "image/jpg" });
      const inputFile = screen.getByTestId("file");

      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      inputFile.addEventListener("change", handleChangeFile);

      userEvent.upload(inputFile, file);

      expect(handleChangeFile).toHaveBeenCalled();
      expect(
        screen.getByTestId("file-error-message").classList).not.toContain("visible");
    });
  });
});

//INTEGRATION TESTS - POST

describe("Given I am connected as Employee on NewBill page, and submit the form", () => {
  beforeEach(() => {
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

  describe("when APi is working well", () => {
    test("then i should be sent on bills page with bills updated", async () => {
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorageMock,
      });

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
      expect(mockStore.bills).toHaveBeenCalled();
    });

    describe("When an error occurs on API", () => {
      test("then it should display a message error", async () => {
        console.error = jest.fn();
        window.onNavigate(ROUTES_PATH.NewBill);
        mockStore.bills.mockImplementationOnce(() => {
          return {
            update: () => {
              return waitFor(() => Promise.reject(new Error("Erreur 404")));
            },
          };
        });

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const form = screen.getByTestId("form-new-bill");
        const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
        form.addEventListener("submit", handleSubmit);

        fireEvent.submit(form);

        expect(handleSubmit).toHaveBeenCalled();

        await waitFor(() => new Promise(process.nextTick));

        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  // Integration test
  describe("Given I am connected as an employee and I submit the form with valid data", () => {
    beforeEach(() => {
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

    test("Then the POST request should be called with the correct data", async () => {
      window.onNavigate(ROUTES_PATH.NewBill);

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId("form-new-bill");

      // Fill in the form with valid data
      userEvent.type(screen.getByTestId("expense-name"), "Test Bill");
      userEvent.type(screen.getByTestId("datepicker"), "2023-04-01");
      userEvent.type(screen.getByTestId("amount"), "100");
      userEvent.type(screen.getByTestId("vat"), "20");
      userEvent.type(screen.getByTestId("pct"), "10");
      userEvent.type(screen.getByTestId("commentary"), "Test commentary");

      const file = new File(["img"], "image.jpg", { type: "image/jpg" });
      userEvent.upload(screen.getByTestId("file"), file);

      // Wait for the handleChangeFile to be called
      await waitFor(() => expect(newBill.fileUrl).toBeTruthy());

      // Submit the form
      fireEvent.submit(form);

      // Check if the POST request is called with the correct data
      const expectedData = {
        email: "a@a",
        type: "Restaurant",
        name: "Test Bill",
        amount: 100,
        date: "2023-04-01",
        vat: "20",
        pct: 10,
        commentary: "Test commentary",
        fileUrl: newBill.fileUrl,
        fileName: "image.jpg",
        status: "pending",
      };
      expect(mockStore.bills().update).toHaveBeenCalledWith({
        data: JSON.stringify(expectedData),
        selector: newBill.billId,
      });
    });
  });
});
