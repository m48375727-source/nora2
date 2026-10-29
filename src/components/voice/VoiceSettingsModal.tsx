import React, { useState, useEffect } from 'react';
import { voice, type VoiceDevice } from '../../lib/voice';
import { sounds } from '../../lib/sound';
import { X, Mic, Volume2, Shield, Keyboard, Sliders } from 'lucide-react';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [inputDevices, setInputDevices] = useState<VoiceDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<VoiceDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [soundEffects, setSoundEffects] = useState(sounds.isEnabled());
  const [pushToTalk, setPushToTalk] = useState(false);
  const [pushKey, setPushKey] = useState('Space');
  const [isCapturingKey, setIsCapturingKey] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    voice.getDevices().then(({ inputs, outputs }) => {
      setInputDevices(inputs);
      setOutputDevices(outputs);
      if (inputs.length > 0) setSelectedInput(inputs[0].deviceId);
      if (outputs.length > 0) setSelectedOutput(outputs[0].deviceId);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (deviceId: string) => {
    setSelectedInput(deviceId);
    voice.setAudioInput(deviceId);
  };

  const handleOutputChange = (deviceId: string) => {
    setSelectedOutput(deviceId);
    voice.setAudioOutput(deviceId);
  };

  const handleToggleSoundEffects = (enabled: boolean) => {
    setSoundEffects(enabled);
    sounds.setEnabled(enabled);
  };

  const handleTogglePushToTalk = (enabled: boolean) => {
    setPushToTalk(enabled);
    voice.setPushToTalk(enabled, pushKey);
  };

  const handleKeyCapture = (e: React.KeyboardEvent) => {
    if (isCapturingKey) {
      e.preventDefault();
      setPushKey(e.code);
      voice.setPushToTalk(pushToTalk, e.code);
      setIsCapturingKey(false);
    }
  };

  return (
    <div
      onKeyDown={handleKeyCapture}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-[#05070d] border border-[#111a2e] rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Ses ve Video Ayarları</h3>
            <p className="text-xs text-slate-400">Ses donanım aygıtlarınızı ve konuşma algılamasını yapılandırın</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Input Device Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-blue-400" />
              Giriş Aygıtı (Mikrofon)
            </label>
            <select
              value={selectedInput}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {inputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
              {inputDevices.length === 0 && <option value="">Varsayılan Mikrofon</option>}
            </select>
          </div>

          {/* Output Device Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              Çıkış Aygıtı (Hoparlör / Kulaklık)
            </label>
            <select
              value={selectedOutput}
              onChange={(e) => handleOutputChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
              {outputDevices.length === 0 && <option value="">Varsayılan Ses Çıkışı</option>}
            </select>
          </div>

          <div className="h-[1px] bg-[#111a2e] my-3" />

          {/* Input Mode: Voice Activity vs Push to Talk */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Giriş Modu
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTogglePushToTalk(false)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  !pushToTalk
                    ? 'border-blue-500 bg-blue-600/15 text-white'
                    : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400 hover:text-white'
                }`}
              >
                <p className="text-xs font-semibold">Ses Etkinliği</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Konuştuğunuzda otomatik olarak iletilir</p>
              </button>

              <button
                type="button"
                onClick={() => handleTogglePushToTalk(true)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  pushToTalk
                    ? 'border-blue-500 bg-blue-600/15 text-white'
                    : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400 hover:text-white'
                }`}
              >
                <p className="text-xs font-semibold">Bas Konuş</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sesi iletmek için bir tuşa basılı tutun</p>
              </button>
            </div>

            {pushToTalk && (
              <div className="mt-3 flex items-center justify-between p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl">
                <span className="text-xs text-slate-300">Kısayol Tuşu:</span>
                <button
                  onClick={() => setIsCapturingKey(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border ${
                    isCapturingKey
                      ? 'border-blue-500 bg-blue-500 text-white animate-pulse'
                      : 'border-[#111a2e] bg-[#111a2e] text-blue-400'
                  }`}
                >
                  {isCapturingKey ? 'Bir tuşa basın...' : pushKey}
                </button>
              </div>
            )}
          </div>

          {/* Sound Cues Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-semibold text-white">Ses Efektleri & Uyarı Sesleri</p>
              <p className="text-[11px] text-slate-400">Katılma, ayrılma ve susturma işlemlerinde yumuşak sesler çal</p>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => handleToggleSoundEffects(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#111a2e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
