import Foundation
import Speech
import AVFAudio

/// FamilyPilot v1 system speech recognizer.
/// - Never permits network recognition.
/// - Never persists raw audio.
/// - Returns one finalized on-device transcript segment to the caller.
/// - May also emit display-only partial text before finalization.
final class FamilyPilotOnDeviceSpeechV1 {
    enum VoiceError: Error, Equatable {
        case speechPermissionDenied
        case microphonePermissionDenied
        case onDeviceRecognitionUnavailable
        case recognitionBusy
        case recognitionFailed
        case emptyTranscript
    }

    typealias Completion = (Result<String, VoiceError>) -> Void

    private let locale: Locale
    private let audioEngine = AVAudioEngine()
    private var recognitionTask: SFSpeechRecognitionTask?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var completion: Completion?
    private var partialHandler: ((String) -> Void)?
    private var recognizing = false

    init(localeIdentifier: String) {
        self.locale = Locale(identifier: localeIdentifier)
    }

    func isAvailable() -> Bool {
        guard let recognizer = SFSpeechRecognizer(locale: locale) else { return false }
        return recognizer.supportsOnDeviceRecognition
    }

    func recognize(
        onPartial: @escaping (String) -> Void = { _ in },
        completion: @escaping Completion
    ) {
        DispatchQueue.main.async {
            guard !self.recognizing else {
                completion(.failure(.recognitionBusy))
                return
            }
            self.recognizing = true
            self.completion = completion
            self.partialHandler = onPartial
            self.authorizeAndStart()
        }
    }

    /// Finalize the current system segment without cancelling its transcript.
    /// The bridge decides whether the whole FamilyPilot voice session should end.
    func stopListening() {
        DispatchQueue.main.async {
            guard self.recognizing else { return }
            if self.audioEngine.isRunning { self.audioEngine.stop() }
            self.request?.endAudio()
        }
    }

    func cancel() {
        DispatchQueue.main.async {
            self.finish(.failure(.recognitionFailed), cancelTask: true)
        }
    }

    private func authorizeAndStart() {
        authorizeSpeech { [weak self] speechAllowed in
            guard let self else { return }
            guard speechAllowed else {
                self.finish(.failure(.speechPermissionDenied))
                return
            }
            self.authorizeMicrophone { [weak self] microphoneAllowed in
                guard let self else { return }
                guard microphoneAllowed else {
                    self.finish(.failure(.microphonePermissionDenied))
                    return
                }
                DispatchQueue.main.async { self.startOnDeviceRecognition() }
            }
        }
    }

    private func authorizeSpeech(_ completion: @escaping (Bool) -> Void) {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            completion(true)
        case .notDetermined:
            SFSpeechRecognizer.requestAuthorization { status in
                completion(status == .authorized)
            }
        default:
            completion(false)
        }
    }

    private func authorizeMicrophone(_ completion: @escaping (Bool) -> Void) {
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted:
                completion(true)
            case .undetermined:
                AVAudioApplication.requestRecordPermission { granted in completion(granted) }
            default:
                completion(false)
            }
        } else {
            let session = AVAudioSession.sharedInstance()
            switch session.recordPermission {
            case .granted:
                completion(true)
            case .undetermined:
                session.requestRecordPermission { granted in completion(granted) }
            default:
                completion(false)
            }
        }
    }

    private func startOnDeviceRecognition() {
        guard let recognizer = SFSpeechRecognizer(locale: locale),
              recognizer.supportsOnDeviceRecognition else {
            finish(.failure(.onDeviceRecognitionUnavailable))
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults = true
        self.request = request

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let input = audioEngine.inputNode
            let format = input.outputFormat(forBus: 0)
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak request] buffer, _ in
                request?.append(buffer)
            }
            audioEngine.prepare()
            try audioEngine.start()
        } catch {
            finish(.failure(.recognitionFailed))
            return
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
                if result.isFinal {
                    self.finish(text.isEmpty ? .failure(.emptyTranscript) : .success(text))
                    return
                }
                if !text.isEmpty {
                    DispatchQueue.main.async { [weak self] in
                        guard let self, self.recognizing else { return }
                        self.partialHandler?(text)
                    }
                }
            }
            if error != nil {
                self.finish(.failure(.recognitionFailed))
            }
        }
    }

    private func finish(_ result: Result<String, VoiceError>, cancelTask: Bool = false) {
        DispatchQueue.main.async {
            guard self.recognizing else { return }
            self.recognizing = false
            if self.audioEngine.isRunning { self.audioEngine.stop() }
            self.audioEngine.inputNode.removeTap(onBus: 0)
            self.request?.endAudio()
            if cancelTask { self.recognitionTask?.cancel() }
            self.recognitionTask = nil
            self.request = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            let callback = self.completion
            self.completion = nil
            self.partialHandler = nil
            callback?(result)
        }
    }
}
