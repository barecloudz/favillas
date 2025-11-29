import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { eastAshevilleData } from "@/data/neighborhoods/east-asheville";

const EastAshevillePage = () => {
  return <NeighborhoodPageTemplate data={eastAshevilleData} />;
};

export default EastAshevillePage;
