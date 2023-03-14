/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import router from "../app/Router.js";
import mockStore from "../__mocks__/store.js";

// jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
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
      //to-do write expect expression
      expect(windowIcon.className).toBe("active-icon");
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
  describe("When I am on Bills page and it's loading", () => {
    test("Then, Loading page should be rendered", () => {
      document.body.innerHTML = BillsUI({ loading: true });
      expect(screen.getAllByText("Loading...")).toBeTruthy();
    });
  });

  // New test
  describe("When I am on Bills page and there is no bill", () => {
    test("Then the bills list should be empty", () => {
      document.body.innerHTML = BillsUI({ data: [] });
      const eyeIcon = screen.queryByTestId("icon-eye");
      expect(eyeIcon).toBeNull();
    });
  });

  // New test
  describe("When i click the 'Nouvelle note de frais' button", () => {
    test("Then newbill appears", () => {
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
  describe("When I click on the eye icon", () => {
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
    test("A modal should open", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const sampleBills = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });
      sampleBills.handleClickIconEye = jest.fn();
      screen.getAllByTestId("icon-eye")[0].click();
      expect(sampleBills.handleClickIconEye).toBeCalled();
    });
    test("Then the modal should display the attached image", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const sampleBills = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });
      const iconEye = document.querySelector(`div[data-testid="icon-eye"]`);
      $.fn.modal = jest.fn();
      sampleBills.handleClickIconEye(iconEye);
      expect(document.querySelector(".modal")).toBeTruthy();
    });
  });
});
