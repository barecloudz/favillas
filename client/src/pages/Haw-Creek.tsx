import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { hawCreekData } from "@/data/neighborhoods/haw-creek";

const HawCreekPage = () => {
  return <NeighborhoodPageTemplate data={hawCreekData} />;
};

export default HawCreekPage;
