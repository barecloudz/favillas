import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { downtownAshevilleData } from "@/data/neighborhoods/downtown-asheville";

const DowntownAshevillePage = () => {
  return <NeighborhoodPageTemplate data={downtownAshevilleData} />;
};

export default DowntownAshevillePage;
