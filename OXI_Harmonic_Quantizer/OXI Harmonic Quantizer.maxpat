{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 0,
      "revision": 10,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      100.0,
      100.0,
      790.0,
      370.0
    ],
    "openinpresentation": 1,
    "gridsize": [
      15.0,
      15.0
    ],
    "devicewidth": 750.0,
    "description": "OXI MIDI quantizer and exact Tetrachords active-chord harmonizer.",
    "digest": "Tetrachords chord-tone, melodic and nearest-note MIDI processor.",
    "tags": "MIDI OXI FH-2 Tetrachords quantizer",
    "boxes": [
      {
        "box": {
          "fontface": 1,
          "fontsize": 16.0,
          "id": "obj-title",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            15.0,
            290.0,
            24.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            10.0,
            290.0,
            24.0
          ],
          "text": "OXI Harmonic Quantizer"
        }
      },
      {
        "box": {
          "id": "obj-subtitle",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            42.0,
            520.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            36.0,
            540.0,
            20.0
          ],
          "text": "Dedicated OXI USB track • Monitor In • MIDI To: your hardware target"
        }
      },
      {
        "box": {
          "id": "obj-midiin",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            20.0,
            90.0,
            48.0,
            22.0
          ],
          "text": "midiin"
        }
      },
      {
        "box": {
          "id": "obj-receive",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20.0,
            125.0,
            205.0,
            22.0
          ],
          "text": "r tetrachords_harmony_bus_v1"
        }
      },
      {
        "box": {
          "id": "obj-js",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 2,
          "outlettype": [
            "",
            ""
          ],
          "patching_rect": [
            270.0,
            105.0,
            200.0,
            22.0
          ],
          "saved_object_attributes": {
            "filename": "oxi_harmonic_quantizer.js",
            "parameter_enable": 0
          },
          "text": "js oxi_harmonic_quantizer.js"
        }
      },
      {
        "box": {
          "id": "obj-midiout",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            515.0,
            90.0,
            55.0,
            22.0
          ],
          "text": "midiout"
        }
      },
      {
        "box": {
          "id": "obj-status-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            175.0,
            50.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            66.0,
            50.0,
            20.0
          ],
          "text": "Status"
        }
      },
      {
        "box": {
          "id": "obj-status",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            85.0,
            173.0,
            625.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            65.0,
            64.0,
            660.0,
            22.0
          ],
          "text": "set \"Waiting for Tetrachords harmony\""
        }
      },
      {
        "box": {
          "id": "obj-loadbang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            20.0,
            230.0,
            60.0,
            22.0
          ],
          "text": "loadbang"
        }
      },
      {
        "box": {
          "id": "obj-delay",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            95.0,
            230.0,
            65.0,
            22.0
          ],
          "text": "delay 100"
        }
      },
      {
        "box": {
          "id": "obj-init",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            175.0,
            230.0,
            40.0,
            22.0
          ],
          "text": "init"
        }
      },
      {
        "box": {
          "id": "obj-channels",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            235.0,
            230.0,
            233.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            228.0,
            260.0,
            20.0
          ],
          "text": "All incoming MIDI channels are quantized."
        }
      },
      {
        "box": {
          "id": "obj-tie-up",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            425.0,
            230.0,
            85.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            205.0,
            228.0,
            85.0,
            22.0
          ],
          "text": "tiebreakup 1"
        }
      },
      {
        "box": {
          "id": "obj-tie-down",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            525.0,
            230.0,
            85.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            305.0,
            228.0,
            85.0,
            22.0
          ],
          "text": "tiebreakup 0"
        }
      },
      {
        "box": {
          "id": "obj-bypass-on",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            625.0,
            230.0,
            65.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            405.0,
            228.0,
            65.0,
            22.0
          ],
          "text": "bypass 1"
        }
      },
      {
        "box": {
          "id": "obj-bypass-off",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20.0,
            275.0,
            65.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            485.0,
            228.0,
            65.0,
            22.0
          ],
          "text": "bypass 0"
        }
      },
      {
        "box": {
          "id": "obj-panic",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            100.0,
            275.0,
            50.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            565.0,
            228.0,
            50.0,
            22.0
          ],
          "text": "panic"
        }
      },
      {
        "box": {
          "id": "obj-thisdevice",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "bang",
            "int",
            "int"
          ],
          "patching_rect": [
            170.0,
            275.0,
            95.0,
            22.0
          ],
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "obj-help",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            290.0,
            275.0,
            380.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            260.0,
            700.0,
            20.0
          ],
          "text": "Harmonizer follows Tetrachords' active MIDI chord. Pitch Class re-roots; Exact Voicing preserves inversion."
        }
      },
      {
        "box": {
          "id": "obj-mode-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            15.0,
            100.0,
            40.0,
            20.0
          ],
          "text": "Mode"
        }
      },
      {
        "box": {
          "id": "obj-mode-chromatic",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            65.0,
            100.0,
            90.0,
            22.0
          ],
          "text": "chromatic"
        }
      },
      {
        "box": {
          "id": "obj-mode-nearest",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            165.0,
            100.0,
            70.0,
            22.0
          ],
          "text": "nearest"
        }
      },
      {
        "box": {
          "id": "obj-mode-up",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            245.0,
            100.0,
            35.0,
            22.0
          ],
          "text": "up"
        }
      },
      {
        "box": {
          "id": "obj-mode-down",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            290.0,
            100.0,
            45.0,
            22.0
          ],
          "text": "down"
        }
      },
      {
        "box": {
          "id": "obj-mode-sticky",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            345.0,
            100.0,
            55.0,
            22.0
          ],
          "text": "sticky"
        }
      },
      {
        "box": {
          "id": "obj-mode-menu",
          "items": [
            "nearest",
            ",",
            "harmonizer",
            ",",
            "chromatic",
            ",",
            "melody",
            ",",
            "voicelead",
            ",",
            "up",
            ",",
            "down",
            ",",
            "sticky"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            20.0,
            320.0,
            140.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            65.0,
            98.0,
            145.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "quantizer_mode",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Quantizer Mode",
              "parameter_shortname": "Mode",
              "parameter_type": 2,
              "parameter_mmax": 7,
              "parameter_enum": [
                "nearest",
                "harmonizer",
                "chromatic",
                "melody",
                "voicelead",
                "up",
                "down",
                "sticky"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                1
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-mode-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            175.0,
            320.0,
            90.0,
            22.0
          ],
          "text": "prepend mode"
        }
      },
      {
        "box": {
          "id": "obj-harmonizer-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            15.0,
            132.0,
            70.0,
            20.0
          ],
          "text": "Chord Map"
        }
      },
      {
        "box": {
          "id": "obj-harmonizer-menu",
          "items": [
            "pitchclass",
            ",",
            "voicing"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            20.0,
            425.0,
            120.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            85.0,
            130.0,
            120.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "chord_map",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Chord Map",
              "parameter_shortname": "Chord Map",
              "parameter_type": 2,
              "parameter_mmax": 1,
              "parameter_enum": [
                "pitchclass",
                "voicing"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-harmonizer-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            155.0,
            425.0,
            135.0,
            22.0
          ],
          "text": "prepend harmonizermap"
        }
      },
      {
        "box": {
          "id": "obj-timing-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            230.0,
            100.0,
            50.0,
            20.0
          ],
          "text": "Change"
        }
      },
      {
        "box": {
          "id": "obj-timing-menu",
          "items": [
            "immediate",
            ",",
            "nextnote",
            ",",
            "nextbar"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            285.0,
            320.0,
            120.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            285.0,
            98.0,
            120.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "harmony_change",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Harmony Change",
              "parameter_shortname": "Change",
              "parameter_type": 2,
              "parameter_mmax": 2,
              "parameter_enum": [
                "immediate",
                "nextnote",
                "nextbar"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                1
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-timing-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            420.0,
            320.0,
            95.0,
            22.0
          ],
          "text": "prepend timing"
        }
      },
      {
        "box": {
          "id": "obj-gravity-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            425.0,
            100.0,
            52.0,
            20.0
          ],
          "text": "Gravity"
        }
      },
      {
        "box": {
          "id": "obj-gravity-menu",
          "items": [
            "off",
            ",",
            "light",
            ",",
            "strong"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            530.0,
            320.0,
            90.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            485.0,
            98.0,
            90.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "root_gravity",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Root Gravity",
              "parameter_shortname": "Gravity",
              "parameter_type": 2,
              "parameter_mmax": 2,
              "parameter_enum": [
                "off",
                "light",
                "strong"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-gravity-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            635.0,
            320.0,
            100.0,
            22.0
          ],
          "text": "prepend gravity"
        }
      },
      {
        "box": {
          "id": "obj-movement-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            230.0,
            132.0,
            70.0,
            20.0
          ],
          "text": "Movement"
        }
      },
      {
        "box": {
          "id": "obj-movement-number",
          "maxclass": "number",
          "maximum": 48,
          "minimum": 24,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            20.0,
            355.0,
            55.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            300.0,
            130.0,
            55.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "movement",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Movement",
              "parameter_shortname": "Movement",
              "parameter_type": 3,
              "parameter_mmin": 24,
              "parameter_mmax": 48,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                24
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-movement-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            90.0,
            355.0,
            110.0,
            22.0
          ],
          "text": "prepend movement"
        }
      },
      {
        "box": {
          "id": "obj-register-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            385.0,
            132.0,
            60.0,
            20.0
          ],
          "text": "Register"
        }
      },
      {
        "box": {
          "id": "obj-low-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            445.0,
            132.0,
            30.0,
            20.0
          ],
          "text": "Low"
        }
      },
      {
        "box": {
          "id": "obj-low-number",
          "maxclass": "number",
          "maximum": 127,
          "minimum": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            220.0,
            355.0,
            50.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            475.0,
            130.0,
            50.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "register_low",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Register Low",
              "parameter_shortname": "Low",
              "parameter_type": 3,
              "parameter_mmin": 0,
              "parameter_mmax": 127,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                24
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-low-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            285.0,
            355.0,
            75.0,
            22.0
          ],
          "text": "prepend low"
        }
      },
      {
        "box": {
          "id": "obj-high-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            540.0,
            132.0,
            32.0,
            20.0
          ],
          "text": "High"
        }
      },
      {
        "box": {
          "id": "obj-high-number",
          "maxclass": "number",
          "maximum": 127,
          "minimum": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            375.0,
            355.0,
            50.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            575.0,
            130.0,
            50.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "register_high",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Register High",
              "parameter_shortname": "High",
              "parameter_type": 3,
              "parameter_mmin": 0,
              "parameter_mmax": 127,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                48
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-high-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            440.0,
            355.0,
            80.0,
            22.0
          ],
          "text": "prepend high"
        }
      },
      {
        "box": {
          "id": "obj-init-controls",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            535.0,
            355.0,
            180.0,
            22.0
          ],
          "text": "24, 24, 48"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-bypass-off",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-bypass-on",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-init",
            0
          ],
          "source": [
            "obj-delay",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-init",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-midiout",
            0
          ],
          "source": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-status",
            1
          ],
          "source": [
            "obj-js",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-delay",
            0
          ],
          "source": [
            "obj-loadbang",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-midiin",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-panic",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            1
          ],
          "source": [
            "obj-receive",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-tie-down",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-tie-up",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-chromatic",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-nearest",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-up",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-down",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-sticky",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-mode-prepend",
            0
          ],
          "source": [
            "obj-mode-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-timing-prepend",
            0
          ],
          "source": [
            "obj-timing-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-timing-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-gravity-prepend",
            0
          ],
          "source": [
            "obj-gravity-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-gravity-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-movement-prepend",
            0
          ],
          "source": [
            "obj-movement-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-movement-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-low-prepend",
            0
          ],
          "source": [
            "obj-low-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-low-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-high-prepend",
            0
          ],
          "source": [
            "obj-high-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-harmonizer-prepend",
            0
          ],
          "source": [
            "obj-harmonizer-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-harmonizer-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-high-prepend",
            0
          ]
        }
      }
    ],
    "dependency_cache": [
      {
        "name": "oxi_harmonic_quantizer.js",
        "bootpath": "~/Documents/Codex/2026-07-26/referenced-chatgpt-conversation-this-is-untrusted/work/tetrachords-oxi-fh2/OXI_Harmonic_Quantizer",
        "patcherrelativepath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ],
    "autosave": 0,
    "oscreceiveudpport": 0
  }
}
