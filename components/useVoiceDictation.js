import { useState, useEffect, useRef } from "react";
import { Keyboard } from "react-native";

let ExpoSpeechModule = null;

try {
  ExpoSpeechModule = require("expo-speech-recognition");
} catch (error) {
  console.log("Speech recognition module not available.");
}

export function useVoiceDictation(onSpeechResult, onError, currentBody = "") {
  const [isListening, setIsListening] = useState(false);

  const isListeningRef = useRef(false);
  const stoppedRef = useRef(false);

  const bodyRef = useRef(currentBody || "");
  const lastResultRef = useRef("");

  const onSpeechResultRef = useRef(onSpeechResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult;
    onErrorRef.current = onError;
  }, [onSpeechResult, onError]);

  useEffect(() => {
    if (!isListeningRef.current) {
      bodyRef.current = currentBody || "";
    }
  }, [currentBody]);

  const clean = (text) => {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizeWord = (word) => {
    return String(word || "")
      .toLowerCase()
      .replace(/[.,!?;:"'()]/g, "")
      .trim();
  };

  const getNewSpeech = (oldText, incomingText) => {
    const old = clean(oldText);
    const incoming = clean(incomingText);

    if (!incoming) return "";
    if (!old) return incoming;

    const oldWords = old.split(" ");
    const incomingWords = incoming.split(" ");

    let matched = 0;

    while (
      matched < oldWords.length &&
      matched < incomingWords.length &&
      normalizeWord(oldWords[matched]) === normalizeWord(incomingWords[matched])
    ) {
      matched++;
    }

    if (matched === oldWords.length) {
      return incomingWords.slice(matched).join(" ").trim();
    }

    return incoming;
  };

  const getTranscript = (event) => {
    const result = event?.results?.[0];
    if (!result) return "";
    if (typeof result === "string") return clean(result);
    return clean(result.transcript);
  };

  const startRecognition = async () => {
    const module = ExpoSpeechModule?.ExpoSpeechRecognitionModule;
    if (!module) return;

    try {
      await module.start({
        lang: "en-US",
        interimResults: false,
        maxAlternatives: 1,
        continuous: false,
        addsPunctuation: true,
      });
    } catch (error) {
      console.log("Start recognition error:", error);
      throw error;
    }
  };

  useEffect(() => {
    const module = ExpoSpeechModule?.ExpoSpeechRecognitionModule;
    if (!module) return;

    const resultSub = module.addListener("result", (event) => {
      const transcript = getTranscript(event);
      if (!transcript) return;

      const newSpeech = getNewSpeech(bodyRef.current, transcript);
      if (!newSpeech) return;

      const normalizedResult = newSpeech
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      if (normalizedResult === lastResultRef.current) return;

      lastResultRef.current = normalizedResult;

      const newBody = clean(`${bodyRef.current} ${newSpeech}`);
      bodyRef.current = newBody;

      onSpeechResultRef.current?.(newBody);
    });

    const endSub = module.addListener("end", () => {
      if (stoppedRef.current) {
        setIsListening(false);
        isListeningRef.current = false;
        return;
      }

      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && !stoppedRef.current) {
            lastResultRef.current = "";
            startRecognition().catch(() => {});
          }
        }, 150);
      }
    });

    const errorSub = module.addListener("error", async (event) => {
      const errorText = String(
        event?.error || event?.message || "",
      ).toLowerCase();

      // Ignore normal speech-recognition endings
      if (
        errorText.includes("no-speech") ||
        errorText.includes("no speech") ||
        errorText.includes("no-match") ||
        errorText.includes("timeout") ||
        errorText.includes("aborted") ||
        event?.error === "6" ||
        event?.error === "7"
      ) {
        return;
      }

      // Forcefully release the native audio session lock on error
      stoppedRef.current = true;
      setIsListening(false);
      isListeningRef.current = false;

      try {
        await module.stop();
      } catch (e) {
        // Ignore stop cleanup errors
      }

      let friendlyMessage =
        event?.message || "Speech recognition error occurred.";
      if (errorText.includes("download") || errorText.includes("language")) {
        friendlyMessage =
          "Offline speech pack not found. Please check your internet connection or Google voice settings to download English speech data.";
      }

      onErrorRef.current?.({
        title: "Dictation Error 🎙️",
        message: friendlyMessage,
      });
    });

    return () => {
      resultSub?.remove();
      endSub?.remove();
      errorSub?.remove();
    };
  }, []);

  const toggleListening = async () => {
    Keyboard.dismiss();

    const module = ExpoSpeechModule?.ExpoSpeechRecognitionModule;

    if (!module) {
      onErrorRef.current?.({
        title: "Development Build Needed 🎙️",
        message: "Run npx expo run:android or use a custom development build.",
      });
      return;
    }

    // ==============================
    // STOP
    // ==============================
    if (isListeningRef.current) {
      stoppedRef.current = true;
      setIsListening(false);
      isListeningRef.current = false;

      try {
        await module.stop();
      } catch (error) {
        console.log("Stop error:", error);
      }

      return;
    }

    // ==============================
    // PERMISSION
    // ==============================
    const permission = await module.requestPermissionsAsync();

    if (!permission.granted) {
      onErrorRef.current?.({
        title: "Permission Required 🎙️",
        message: "Microphone permission is required for voice dictation.",
      });
      return;
    }

    // ==============================
    // START
    // ==============================
    stoppedRef.current = false;
    bodyRef.current = clean(currentBody);
    lastResultRef.current = "";

    try {
      setIsListening(true);
      isListeningRef.current = true;
      await startRecognition();
    } catch (err) {
      stoppedRef.current = true;
      setIsListening(false);
      isListeningRef.current = false;

      try {
        await module.stop();
      } catch (e) {}

      onErrorRef.current?.({
        title: "Dictation Error 🎙️",
        message:
          "Could not start speech recognition. Check your network or speech settings.",
      });
    }
  };

  return {
    isListening,
    toggleListening,
  };
}
