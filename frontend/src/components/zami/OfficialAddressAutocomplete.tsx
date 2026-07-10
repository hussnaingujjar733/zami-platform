"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

type AddressSuggestion = {
  id: string;
  label: string;
  name: string;
  score: number;
  housenumber: string | null;
  street: string | null;
  postcode: string | null;
  citycode: string | null;
  city: string | null;
  district: string | null;
  context: string | null;
  type: string | null;
  longitude: number;
  latitude: number;
};

type SuggestionsResponse = {
  query: string;
  suggestions: AddressSuggestion[];
};

type ErrorResponse = {
  detail?: string;
  error?: string;
};

export function OfficialAddressAutocomplete() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cleanQuery = query.trim();

    if (selected && query === selected.label) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    if (cleanQuery.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      setSearched(false);

      try {
        const response = await fetch(
          `/api/backend/property/address-suggestions?q=${encodeURIComponent(cleanQuery)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as
          | SuggestionsResponse
          | ErrorResponse;

        if (!response.ok) {
          const failure = payload as ErrorResponse;

          throw new Error(
            failure.detail ||
              failure.error ||
              "La recherche d’adresse est indisponible.",
          );
        }

        const data = payload as SuggestionsResponse;

        setSuggestions(data.suggestions ?? []);
        setSearched(true);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setSuggestions([]);
        setSearched(true);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "La recherche d’adresse est indisponible.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  function changeQuery(value: string) {
    setQuery(value);
    setSelected(null);
    setError("");
  }

  function selectAddress(address: AddressSuggestion) {
    setSelected(address);
    setQuery(address.label);
    setSuggestions([]);
    setSearched(false);
    setError("");

    window.localStorage.setItem(
      "zami_selected_address",
      JSON.stringify({
        ...address,
        selected_at: new Date().toISOString(),
        source: "Base Adresse Nationale",
      }),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      setError(
        "Sélectionnez une adresse officielle dans les résultats proposés.",
      );
      return;
    }

    const parameters = new URLSearchParams({
      address: selected.label,
      address_id: selected.id,
      postcode: selected.postcode ?? "",
      citycode: selected.citycode ?? "",
      city: selected.city ?? "",
      lat: String(selected.latitude),
      lon: String(selected.longitude),
    });

    router.push(`/analyse?${parameters.toString()}`);
  }

  const showResults =
    !selected &&
    query.trim().length >= 3 &&
    (loading || searched || suggestions.length > 0);

  return (
    <div className="zami-address-search">
      <form onSubmit={submit} className="zami-address-search-form">
        <div className="zami-address-input">
          <MapPin size={21} />

          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Commencez à saisir votre adresse…"
            aria-label="Adresse du logement"
            autoComplete="off"
            spellCheck={false}
          />

          {loading ? (
            <LoaderCircle
              className="zami-address-spinner"
              size={18}
            />
          ) : selected ? (
            <span className="zami-address-check">
              <Check size={14} />
            </span>
          ) : (
            <Search size={18} />
          )}
        </div>

        <button type="submit" disabled={!selected}>
          Analyser mon logement
          <ArrowRight size={17} />
        </button>
      </form>

      {showResults && (
        <div className="zami-address-results">
          {loading && (
            <div className="zami-address-message">
              <LoaderCircle
                className="zami-address-spinner"
                size={18}
              />

              Recherche dans la Base Adresse Nationale…
            </div>
          )}

          {!loading &&
            suggestions.map((address) => (
              <button
                key={address.id}
                type="button"
                className="zami-address-result"
                onClick={() => selectAddress(address)}
              >
                <span className="zami-address-result-icon">
                  <MapPin size={17} />
                </span>

                <span className="zami-address-result-text">
                  <strong>{address.label}</strong>

                  <small>
                    {[
                      address.postcode,
                      address.city,
                      address.district,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>

                <span className="zami-address-result-source">
                  BAN
                </span>
              </button>
            ))}

          {!loading &&
            searched &&
            suggestions.length === 0 &&
            !error && (
              <div className="zami-address-message">
                <Search size={18} />

                Aucune adresse exacte trouvée. Ajoutez le numéro,
                la rue, la commune ou le code postal.
              </div>
            )}

          <div className="zami-address-results-footer">
            <ShieldCheck size={14} />
            Suggestions officielles de la Base Adresse Nationale
          </div>
        </div>
      )}

      {selected && (
        <div className="zami-address-selected">
          <ShieldCheck size={17} />

          <span>
            <strong>Adresse officielle sélectionnée</strong>
            <small>{selected.label}</small>
          </span>

          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setSuggestions([]);
              setSearched(false);
            }}
          >
            Modifier
          </button>
        </div>
      )}

      {error && (
        <p className="zami-address-error">{error}</p>
      )}
    </div>
  );
}
