import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { southAshevilleData } from "@/data/neighborhoods/south-asheville";

const SouthAshevillePage = () => {
  return <NeighborhoodPageTemplate data={southAshevilleData} />;
};

export default SouthAshevillePage;
