import api from "./axios";

export const createSale = async (data: any) => {
  const res = await api.post("/sales", data);
  return res.data.sale;
};