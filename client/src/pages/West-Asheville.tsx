import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { westAshevilleData } from "@/data/neighborhoods/west-asheville";

const WestAshevillePage = () => {
  return <NeighborhoodPageTemplate data={westAshevilleData} />;
};

export default WestAshevillePage;
