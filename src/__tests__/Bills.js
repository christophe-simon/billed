/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import router from "../app/Router.js";
import { formatDate, formatStatus } from "../app/format.js";
import mockStore from "../__mocks__/store.js";
import $ from "jquery";

// jest.mock("../app/store", () => mockStore);
$.fn.modal = jest.fn();

describe("Given I am connected as an employee", () => {
  describe("When I am on the Bills Page", () => {
    // Original test
    test("Then bill icon in vertical layout should be highlighted", async () => {
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
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do: write expect expression
      expect(windowIcon.classList).toContain("active-icon");
    });

    // Original test
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    // New test
    test("Then bills should display an error message when an error is returned by the backend", () => {
      document.body.innerHTML = BillsUI({ error: "some error message" });
      expect(screen.getAllByText("Erreur")).toBeTruthy();
    });
  });

  // New test
  describe("When I am on the Bills page and it's loading", () => {
    test("Then Loading page should be rendered", () => {
      document.body.innerHTML = BillsUI({ loading: true });
      expect(screen.getAllByText("Loading...")).toBeTruthy();
    });
  });

  // New test
  describe("When I am on the Bills page and there is no bill", () => {
    test("Then the bills list should be empty", () => {
      document.body.innerHTML = BillsUI({ data: [] });
      const eyeIcon = screen.queryByTestId("icon-eye");
      expect(eyeIcon).toBeNull();
    });
  });

  // New test
  describe("When I am on the Bills page and I click on the 'Nouvelle note de frais' button", () => {
    test("Then the NewBill page appears", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const billsPage = new Bills({
        document,
        onNavigate,
        store: null,
        bills: bills,
        localStorage: window.localStorage,
      });

      const OpenNewBill = jest.fn(billsPage.handleClickNewBill);
      const btnNewBill = screen.getByTestId("btn-new-bill");
      btnNewBill.addEventListener("click", OpenNewBill);
      fireEvent.click(btnNewBill);
      expect(OpenNewBill).toHaveBeenCalled();
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
    });
  });

  // New test
  describe("When I am on the Bills page and I click on the eye icon next to a listed bill ", () => {
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
    test("Then a modal should open", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const sampleBills = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const iconEye = screen.getAllByTestId("icon-eye")[0];
      fireEvent.click(iconEye);

      expect($.fn.modal).toHaveBeenCalled();
    });

    test("Then the modal should display the attached image", async () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const sampleBills = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const iconEye = screen.getAllByTestId("icon-eye")[0];
      fireEvent.click(iconEye);

      await waitFor(() => expect($.fn.modal).toHaveBeenCalledWith("show"));
    });
  });

  // New test
  describe("When I am on the Bills page and I call the getBills method", () => {
    test("Then it should return bills data if bills are available in the store", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const store = {
        bills: () => ({
          list: () => Promise.resolve(bills),
        }),
      };

      const sampleBills = new Bills({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const billsData = await sampleBills.getBills();
      expect(billsData).toEqual(
        bills.map((bill) => ({
          ...bill,
          date: formatDate(bill.date),
          status: formatStatus(bill.status),
        }))
      );
    });

    test("Then it should return an empty array if no bills are available in the store", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const store = {
        bills: () => ({
          list: () => Promise.resolve([]),
        }),
      };

      const sampleBills = new Bills({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const billsData = await sampleBills.getBills();
      expect(billsData).toEqual([]);
    });
  });

  // Intégration test
  describe("Given I am connected as an employee", () => {
    describe("When I navigate to Bills", () => {
      test("fetches bills from mock API GET", async () => {
        localStorage.setItem(
          "user",
          JSON.stringify({ type: "Employee", email: "e@e" })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH.Bills);
        await waitFor(() => screen.getByText("Mes notes de frais"));

        // Attendez que tous les éléments bill-id soient disponibles dans le DOM
        // await waitFor(() =>
        //   expect(screen.queryAllByTestId("bill-id").length).toBe(4)
        // );

        await waitFor(() =>
          console.log(screen.queryAllByTestId("bill-id").length)
        );
        expect(screen.queryAllByTestId("bill-id").length).toBe(4);

        const billsList = screen.getAllByTestId("bill-id");
        expect(billsList.length).toBe(4);
      });

      test("create a new bill", async () => {
        window.onNavigate(ROUTES_PATH.NewBill);
        await waitFor(() => screen.getByText("Envoyer une note de frais"));

        const file = new File(["hello"], "hello.png", { type: "image/png" });
        const fileInput = screen.getByTestId("file");
        userEvent.upload(fileInput, file);

        const billType = screen.getByTestId("expense-type");
        userEvent.selectOptions(billType, "Transports");

        const billName = screen.getByTestId("expense-name");
        userEvent.type(billName, "Train");

        const billAmount = screen.getByTestId("amount");
        userEvent.type(billAmount, "120.00");

        const billDate = screen.getByTestId("datepicker");
        userEvent.type(billDate, "2022-10-01");

        const billVAT = screen.getByTestId("vat");
        userEvent.type(billVAT, "20");

        const billPct = screen.getByTestId("pct");
        userEvent.type(billPct, "80");

        const billComment = screen.getByTestId("commentary");
        userEvent.type(billComment, "Business trip to Paris");

        const submitBtn = screen.getByTestId("form-new-bill-btn");
        userEvent.click(submitBtn);

        await waitFor(() => screen.getByText("Mes notes de frais"));
        const updatedBillsList = screen.getAllByTestId("bill-id");
        expect(updatedBillsList.length).toBe(5);
      });
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "e@e",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
