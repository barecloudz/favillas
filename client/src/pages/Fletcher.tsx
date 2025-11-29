import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { fletcherData } from "@/data/neighborhoods/fletcher";

const FletcherPage = () => {
  return <NeighborhoodPageTemplate data={fletcherData} />;
};

export default FletcherPage;
