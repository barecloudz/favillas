import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { fairviewData } from "@/data/neighborhoods/fairview";

const FairviewPage = () => {
  return <NeighborhoodPageTemplate data={fairviewData} />;
};

export default FairviewPage;
