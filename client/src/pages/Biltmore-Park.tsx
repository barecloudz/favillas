import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { biltmoreParkData } from "@/data/neighborhoods/biltmore-park";

const BiltmoreParkPage = () => {
  return <NeighborhoodPageTemplate data={biltmoreParkData} />;
};

export default BiltmoreParkPage;
