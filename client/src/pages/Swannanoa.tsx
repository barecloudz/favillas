import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { swannanoaData } from "@/data/neighborhoods/swannanoa";

const SwannanoaPage = () => {
  return <NeighborhoodPageTemplate data={swannanoaData} />;
};

export default SwannanoaPage;
