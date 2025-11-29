import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { skylandData } from "@/data/neighborhoods/skyland";

const SkylandPage = () => {
  return <NeighborhoodPageTemplate data={skylandData} />;
};

export default SkylandPage;
