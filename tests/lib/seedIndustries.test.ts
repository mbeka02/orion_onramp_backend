import seedIndustries, { SeedIndustry } from "../../src/lib/seedIndustries";

jest.mock("../../src/lib/db", () => {
  return { db: {} };
});

describe("seedIndustries", () => {
  const dbModule = require("../../src/lib/db");

  beforeEach(() => {
    // reset mocked db object each test
    dbModule.db = {
      select: jest.fn(),
      insert: jest.fn(),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  it("creates industries and categories when none exist", async () => {
    // Provide a small controlled dataset for the test
    const data: SeedIndustry[] = [
      { name: "TestFinance", categories: ["Investments", "Banking"] },
      { name: "TestTech", categories: ["SaaS"] },
    ];

    // Helper builders
    const makeSelectReturn = (rows: any[]) => ({ from: () => ({ where: () => Promise.resolve(rows) }) });
    const makeInsertReturn = (id: string) => ({ values: () => ({ returning: () => Promise.resolve([{ id }]) }) });

    // For each select call we want to return empty result (nothing exists yet)
    const totalSelects = data.reduce((acc, d) => acc + 1 + (d.categories?.length ?? 0), 0);
    const selectMock = dbModule.db.select = jest.fn();
    for (let i = 0; i < totalSelects; i++) {
      selectMock.mockImplementationOnce(() => makeSelectReturn([]));
    }

    // For inserts: first two industries -> two ids, then categories (3) -> three ids
    const insertMock = dbModule.db.insert = jest.fn();
    insertMock.mockImplementationOnce(() => makeInsertReturn("ind-1"));
    insertMock.mockImplementationOnce(() => makeInsertReturn("ind-2"));
    insertMock.mockImplementationOnce(() => makeInsertReturn("cat-1"));
    insertMock.mockImplementationOnce(() => makeInsertReturn("cat-2"));
    insertMock.mockImplementationOnce(() => makeInsertReturn("cat-3"));

    const res = await seedIndustries(data);

    expect(res.industries.length).toBe(2);
    expect(res.industries.every((i: any) => i.created)).toBeTruthy();
    expect(res.categories.length).toBe(3);
    expect(res.categories.filter((c: any) => c.created).length).toBe(3);
  });

  it("skips creating when industry and category already exist", async () => {
    const data: SeedIndustry[] = [{ name: "ExistingIndustry", categories: ["Investments"] }];

    const makeSelectReturn = (rows: any[]) => ({ from: () => ({ where: () => Promise.resolve(rows) }) });
    const selectMock = dbModule.db.select = jest.fn();

    // First select for industry returns an existing row
    selectMock.mockImplementationOnce(() => makeSelectReturn([{ id: "existing-ind" }]));
    // Then select for category returns existing
    selectMock.mockImplementationOnce(() => makeSelectReturn([{ id: "existing-cat" }]));

    // insert should not be called at all because both found
    dbModule.db.insert = jest.fn();

    const res = await seedIndustries(data);

    expect(res.industries.length).toBe(1);
    expect(res.industries[0].created).toBe(false);
    expect(res.categories.length).toBe(1);
    expect(res.categories[0].created).toBe(false);
    expect(dbModule.db.insert).not.toHaveBeenCalled();
  });
});
