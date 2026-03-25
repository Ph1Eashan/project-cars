import { useEffect, useState } from "react";

import { fetchDashboardData } from "../lib/api";

export function useDashboardData(projectId) {
  const [state, setState] = useState({
    loading: false,
    error: "",
    analysis: null,
    carView: null,
    rules: null
  });

  useEffect(() => {
    let active = true;

    if (!projectId) {
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        analysis: null,
        carView: null,
        rules: null
      }));
      return undefined;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: ""
    }));

    fetchDashboardData(projectId)
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: "",
          analysis: data.analysis,
          carView: data.carView,
          rules: data.rules
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
          analysis: null,
          carView: null,
          rules: current.rules
        }));
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  return state;
}
