import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { northAshevilleData } from "@/data/neighborhoods/north-asheville";

const NorthAshevillePage = () => {
  return <NeighborhoodPageTemplate data={northAshevilleData} />;
};

export default NorthAshevillePage;
