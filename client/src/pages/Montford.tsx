import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { montfordData } from "@/data/neighborhoods/montford";

const MontfordPage = () => {
  return <NeighborhoodPageTemplate data={montfordData} />;
};

export default MontfordPage;
